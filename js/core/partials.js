const cache = {};
const currentPath = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

function load(name) {
  if (cache[name]) return Promise.resolve(cache[name]);
  return fetch('partials/' + name + '.html').then((r) => {
    if (!r.ok) throw new Error('Partial load failed: ' + name);
    return r.text();
  }).then((html) => {
    cache[name] = html;
    return html;
  });
}

function markActive(scope) {
  scope.querySelectorAll('[data-nav-root] a[href]').forEach((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href && href === currentPath) a.classList.add('active');
  });
}

function mount(name, placeholder) {
  return load(name).then((html) => {
    placeholder.innerHTML = html;
    markActive(placeholder);
    placeholder.dispatchEvent(new CustomEvent('partial:loaded', { bubbles: true, detail: { name } }));
  });
}

export function initPartials() {
  const placeholders = document.querySelectorAll('[data-partial]');
  return Promise.all(Array.from(placeholders).map((el) => mount(el.getAttribute('data-partial'), el)));
}
