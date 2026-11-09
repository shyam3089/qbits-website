// A small lexer for the languages used by the maintained examples. All source
// is inserted as text nodes, including HTML examples; it is never evaluated.
const keywords = new Set('component class computed action shared import from as on click input change if else for in key slot true false const let export default return new'.split(' '));
const builtins = new Set('str len count contains defineConfig languagePlugin document runtime npm install'.split(' '));
const tokenPattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|#[^\n]*|\b\d+\b|--[\w-]+|[A-Za-z_][\w-]*|[^\w\s])/g;

export function highlightCode(container, language) {
  const source = container.textContent;
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const match of source.matchAll(tokenPattern)) {
    fragment.append(document.createTextNode(source.slice(cursor, match.index)));
    const value = match[0];
    let kind = 'punctuation';
    if (/^["']/.test(value)) kind = 'string';
    else if (value.startsWith('//') || (value.startsWith('#') && language !== 'css')) kind = 'comment';
    else if (/^\d/.test(value)) kind = 'number';
    else if (keywords.has(value)) kind = 'keyword';
    else if (builtins.has(value) || value.startsWith('--')) kind = 'builtin';
    else if (/^[A-Z]/.test(value)) kind = 'type';
    else if (/^\w/.test(value)) kind = 'plain';
    const span = document.createElement('span');
    span.className = `syntax-${kind}`;
    span.textContent = value;
    fragment.append(span);
    cursor = match.index + value.length;
  }
  fragment.append(document.createTextNode(source.slice(cursor)));
  container.replaceChildren(fragment);
  container.setAttribute('aria-label', `${language} source code`);
  container.setAttribute('tabindex', '0');
}
