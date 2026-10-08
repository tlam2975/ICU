import './font-lab.css';

const storageKey = 'icu-font-lab-v1';
const defaults = { heading: { name: 'Newsreader', weight: 500 }, label: { name: 'Montserrat', weight: 700 }, body: { name: 'Montserrat', weight: 400 } };
const roles = ['heading', 'label', 'body'];

function parseFont(input, weight) {
  let name = input.trim();
  let url;
  if (/^https?:\/\//i.test(name)) {
    const supplied = new URL(name);
    if (supplied.protocol !== 'https:') throw new Error('Use an https Google Fonts link.');
    if (supplied.hostname === 'fonts.google.com' && supplied.pathname.startsWith('/specimen/')) {
      name = decodeURIComponent(supplied.pathname.slice(10)).replaceAll('+', ' ');
    } else if (supplied.hostname === 'fonts.googleapis.com' && ['/css', '/css2'].includes(supplied.pathname)) {
      name = (supplied.searchParams.get('family') || '').split(':')[0].split('|')[0];
      url = supplied.href;
    } else throw new Error('Paste a Google Fonts specimen link, CSS link, or just a font name.');
  }
  if (!/^[\p{L}\p{N} -]{1,100}$/u.test(name)) throw new Error('Enter a font name such as Lora, or a Google Fonts link.');
  return { name, weight, url: url || 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name) + ':wght@' + weight + '&display=swap', source: input.trim() };
}

async function loadFont(font) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = font.url;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { link.remove(); reject(new Error('Loading timed out. Check your connection and try again.')); }, 12000);
    link.onload = () => { clearTimeout(timer); resolve(); };
    link.onerror = () => { clearTimeout(timer); link.remove(); reject(new Error('This font or weight could not load. Try weight 400 or check the font name.')); };
    document.head.append(link);
  });
  try {
    const faces = await document.fonts.load(font.weight + ' 20px "' + font.name + '"');
    if (!faces.length) throw new Error('The link did not provide this font. Check its family name.');
  } catch (error) { link.remove(); throw error; }
}

export async function initFontLab() {
  if (!import.meta.env.DEV && !new URLSearchParams(location.search).has('fontlab')) return;
  let state = { fonts: {}, history: [] };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (stored?.fonts && Array.isArray(stored.history)) state = stored;
  } catch { /* The lab also works without storage. */ }
  let original = false;
  const lab = document.createElement('aside');
  lab.className = 'font-lab';
  lab.setAttribute('aria-label', 'Draft font preview');
  lab.innerHTML = `
    <button class="font-lab-toggle" type="button" aria-expanded="false" aria-controls="font-lab-panel">Aa <span>Font lab</span></button>
    <div id="font-lab-panel" hidden>
      <div class="font-lab-top"><strong>Try a different voice.</strong><button type="button" data-lab-close aria-label="Close font lab">×</button></div>
      <p>Preview fonts on this page. Your choices stay in this browser.</p>
      <form>
        <label>Apply to<select name="role"><option value="heading">Headings</option><option value="label">Labels & navigation</option><option value="body">Body text</option></select></label>
        <label>Font name or Google Fonts link<input name="source" placeholder="Lora or fonts.google.com/specimen/…" required autocomplete="off"></label>
        <label>Weight<select name="weight"><option value="300">300 · Light</option><option value="400">400 · Regular</option><option value="500" selected>500 · Medium</option><option value="600">600 · Semibold</option><option value="700">700 · Bold</option><option value="800">800 · Extra bold</option><option value="900">900 · Black</option></select></label>
        <button class="font-lab-apply" type="submit">Preview font</button>
      </form>
      <p class="font-lab-status" role="status" aria-live="polite">Paste a specimen link, CSS link, or type a family name.</p>
      <div class="font-lab-actions"><button type="button" data-compare aria-pressed="false">Compare original</button><button type="button" data-reset>Reset all</button><button type="button" data-export>Copy choices</button></div>
      <p class="font-lab-current"></p>
      <div class="font-lab-history" aria-label="Recently tried fonts"></div>
      <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer">Browse Google Fonts ↗</a>
      <small>Some fonts have limited weights or Vietnamese support. Use EN / VI to check both.</small>
    </div>`;
  document.body.append(lab);
  const toggle = lab.querySelector('.font-lab-toggle');
  const panel = lab.querySelector('#font-lab-panel');
  const form = lab.querySelector('form');
  const status = lab.querySelector('.font-lab-status');
  const compare = lab.querySelector('[data-compare]');
  const history = lab.querySelector('.font-lab-history');
  function setOpen(open) { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); if (open) form.elements.source.focus(); }
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  lab.querySelector('[data-lab-close]').addEventListener('click', () => { setOpen(false); toggle.focus(); });
  lab.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); toggle.focus(); } });
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { status.textContent = 'Preview applied. Browser storage is unavailable, so it will not survive a reload.'; } }
  function paint() {
    for (const role of roles) {
      const font = !original && state.fonts[role];
      document.documentElement.style[font ? 'setProperty' : 'removeProperty']('--font-' + role, font ? '"' + font.name + '"' : '');
      document.documentElement.style[font ? 'setProperty' : 'removeProperty']('--' + role + '-weight', font ? font.weight : '');
    }
    compare.setAttribute('aria-pressed', String(original));
    compare.textContent = original ? 'Return to preview' : 'Compare original';
    lab.querySelector('.font-lab-current').textContent = roles.map((role) => { const font = original ? defaults[role] : state.fonts[role] || defaults[role]; return role + ': ' + font.name + ' ' + font.weight; }).join(' · ');
    history.replaceChildren();
    state.history.slice(0, 20).forEach((font) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = font.name + ' ' + font.weight;
      button.addEventListener('click', () => { form.elements.source.value = font.source; form.elements.weight.value = font.weight; form.requestSubmit(); });
      history.append(button);
    });
  }
  form.elements.role.addEventListener('change', () => {
    const font = state.fonts[form.elements.role.value] || defaults[form.elements.role.value];
    form.elements.source.value = font.source || font.name;
    form.elements.weight.value = font.weight;
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const role = form.elements.role.value;
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      const font = parseFont(form.elements.source.value, Number(form.elements.weight.value));
      status.textContent = 'Loading ' + font.name + '…';
      await loadFont(font);
      state.fonts[role] = font;
      state.history = [font, ...state.history.filter((item) => item.name !== font.name || item.weight !== font.weight)].slice(0, 20);
      original = false;
      paint();
      status.textContent = font.name + ' applied to ' + role + '. Try another anytime.';
      save();
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  compare.addEventListener('click', () => { original = !original; paint(); });
  lab.querySelector('[data-reset]').addEventListener('click', () => { state.fonts = {}; original = false; paint(); save(); status.textContent = 'Original fonts restored. Your recent fonts are still below.'; });
  lab.querySelector('[data-export]').addEventListener('click', async () => {
    const text = roles.map((role) => { const font = state.fonts[role] || defaults[role]; return role + ': ' + font.name + ', weight ' + font.weight + (font.url ? '\n' + font.url : ''); }).join('\n');
    try { await navigator.clipboard.writeText(text); status.textContent = 'Font choices copied. Paste them when you are ready to keep a pair.'; }
    catch { status.textContent = text; }
  });
  document.querySelectorAll('a[data-route]').forEach((link) => { const url = new URL(link.href); url.searchParams.set('fontlab', '1'); link.href = url.href; });
  for (const role of roles) {
    const font = state.fonts[role];
    if (!font) continue;
    try {
      const validated = parseFont(font.source, Number(font.weight));
      await loadFont(validated);
      state.fonts[role] = validated;
    } catch { delete state.fonts[role]; status.textContent = 'A saved font could not load. You can try it again below.'; }
  }
  paint();
}
