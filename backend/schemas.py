import re
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class SiteConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(default="Qbits", min_length=1, max_length=60)
    eyebrow: str = Field(default="A MODERN UI FRAMEWORK", min_length=1, max_length=80)
    headline: str = Field(default="Build modern apps with", min_length=1, max_length=90)
    highlight: str = Field(default="less code", min_length=1, max_length=40)
    description: str = Field(default="Python-like simple syntax. Reactive by design.", max_length=180)
    description_second: str = Field(default="Component-based. Built for the modern world.", max_length=180)
    github_url: str = "https://github.com/shyam3089/qubits"
    npm_url: str = "https://www.npmjs.com/package/qbits"
    install_command: str = Field(default="npm install qbits", min_length=1, max_length=120)
    theme: Literal["neon", "ultraviolet", "midnight", "apple"] = "apple"
    tokens: dict[str, str] = Field(default_factory=dict, max_length=256)

    @field_validator("github_url", "npm_url")
    @classmethod
    def safe_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Use an absolute HTTPS URL without credentials")
        if len(value) > 500 or any(ord(c) < 33 for c in value):
            raise ValueError("Invalid URL")
        return value

    @field_validator("tokens")
    @classmethod
    def safe_tokens(cls, values: dict[str, str]) -> dict[str, str]:
        for key, value in values.items():
            if not re.fullmatch(r"--[a-z][a-z0-9-]{1,64}", key):
                raise ValueError("Theme token names must be CSS custom properties")
            if not value or len(value) > 300 or re.search(r"[;{}<>\\]|url\s*\(|expression|@import", value, re.I):
                raise ValueError("Theme tokens must be plain CSS values without URLs or declarations")
        return values


class Section(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    body: str
    code: str = ""


class Page(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    intro: str
    sections: list[Section]


class Login(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: SecretStr = Field(min_length=1, max_length=256)
