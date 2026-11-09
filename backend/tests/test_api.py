import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path, "test-only-password")) as client:
        yield client


def login(client):
    response = client.post("/api/admin/login", json={"password": "test-only-password"})
    assert response.status_code == 200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=strict" in response.headers["set-cookie"]
    return {"X-Qbits-CSRF": response.json()["csrf"]}


def test_health_and_validated_site(client):
    assert client.get("/api/health").json()["status"] == "ok"
    site = client.get("/api/site")
    assert site.status_code == 200
    assert site.json()["install_command"] == "npm install qbits"
    assert site.headers["cache-control"] == "no-cache"
    assert site.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize("slug", ["features", "docs", "examples", "roadmap"])
def test_maintained_pages(client, slug):
    response = client.get(f"/api/pages/{slug}")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == slug
    assert len(body["sections"]) >= 3
    assert len({item["id"] for item in body["sections"]}) == len(body["sections"])


@pytest.mark.parametrize("path", ["/api/pages/missing", "/api/pages/site.json", "/api/unknown"])
def test_missing_api_is_json_404(client, path):
    response = client.get(path)
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/json"


def test_settings_require_auth_and_csrf(client):
    body = client.get("/api/site").json()
    assert client.get("/api/admin/session").status_code == 401
    assert client.put("/api/admin/site", json=body).status_code == 401
    headers = login(client)
    assert client.get("/api/admin/session").status_code == 200
    assert client.put("/api/admin/site", json=body).status_code == 403
    assert client.put("/api/admin/site", json=body, headers={**headers, "Origin": "https://untrusted.invalid"}).status_code == 403
    assert client.put("/api/admin/site", json=body, headers=headers).status_code == 200
    assert client.post("/api/admin/logout", headers=headers).status_code == 200
    assert client.get("/api/admin/session").status_code == 401


def test_file_persistence_across_app_restarts(tmp_path):
    with TestClient(create_app(tmp_path, "test-only-password")) as client:
        headers = login(client)
        body = client.get("/api/site").json()
        body.update(theme="midnight", github_url="https://github.com/shyam3089/qubits/issues", tokens={"--accent": "#88ccff", "--headline-size": "44px"})
        assert client.put("/api/admin/site", json=body, headers=headers).status_code == 200
    with TestClient(create_app(tmp_path, "test-only-password")) as restarted:
        assert restarted.get("/api/site").json() == body


@pytest.mark.parametrize("change", [
    {"github_url": "javascript:alert(1)"}, {"npm_url": "http://example.com"},
    {"github_url": "https://admin:password@example.com"}, {"theme": "unknown"},
    {"tokens": {"color": "red"}}, {"tokens": {"--accent": "red;display:none"}},
    {"tokens": {"--accent": "url(https://example.com/track)"}}, {"extra": "rejected"},
])
def test_invalid_settings_do_not_mutate_saved_config(client, change):
    headers = login(client)
    original = client.get("/api/site").json()
    assert client.put("/api/admin/site", json={**original, **change}, headers=headers).status_code == 422
    assert client.get("/api/site").json() == original


def test_login_rate_limit_and_origin(client):
    assert client.post("/api/admin/login", json={"password": "test-only-password"}, headers={"Origin": "https://untrusted.invalid"}).status_code == 403
    for _ in range(5):
        assert client.post("/api/admin/login", json={"password": "incorrect"}).status_code == 401
    assert client.post("/api/admin/login", json={"password": "test-only-password"}).status_code == 429


def test_unconfigured_admin_is_explicitly_disabled(tmp_path, monkeypatch):
    monkeypatch.delenv("QBITS_ADMIN_PASSWORD", raising=False)
    with TestClient(create_app(tmp_path)) as client:
        response = client.post("/api/admin/login", json={"password": "anything"})
        assert response.status_code == 503
        assert "QBITS_ADMIN_PASSWORD" in response.json()["detail"]


def test_production_deep_links_and_assets(client):
    for route in ("/", "/docs", "/features", "/examples", "/roadmap", "/admin"):
        response = client.get(route)
        assert response.status_code == 200
        assert '<div id="app"></div>' in response.text
    assert client.get("/favicon.svg").status_code == 200
