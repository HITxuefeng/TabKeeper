const THEMES = {
  dark:     { label: 'Dark',     bg: '#0f1117', '--bg': '#0f1117', '--bg2': '#1a1d27', '--bg3': '#242736', '--border': '#2e3248', '--text': '#e2e4f0', '--text2': '#8b8fa8', '--text3': '#5a5e78', '--accent': '#6c63ff', '--accent2': '#ff6584' },
  light:    { label: 'Light',    bg: '#f0f2f8', '--bg': '#f0f2f8', '--bg2': '#ffffff', '--bg3': '#e8eaf2', '--border': '#d0d4e8', '--text': '#1a1d2e', '--text2': '#555870', '--text3': '#9096b0', '--accent': '#5b52e8', '--accent2': '#e8436e' },
  midnight: { label: 'Midnight', bg: '#0d1b2a', '--bg': '#0d1b2a', '--bg2': '#112236', '--bg3': '#162d44', '--border': '#1e3a54', '--text': '#d6e8f8', '--text2': '#7a9ab8', '--text3': '#4a6a88', '--accent': '#38bdf8', '--accent2': '#fb923c' },
  forest:   { label: 'Forest',   bg: '#0d1f0f', '--bg': '#0d1f0f', '--bg2': '#132817', '--bg3': '#1a331f', '--border': '#1f4026', '--text': '#d4f0d8', '--text2': '#6da87a', '--text3': '#3d6645', '--accent': '#4ade80', '--accent2': '#facc15' },
  rose:     { label: 'Rose',     bg: '#1f0d15', '--bg': '#1f0d15', '--bg2': '#2a1020', '--bg3': '#36152a', '--border': '#4a1e38', '--text': '#f4d4e4', '--text2': '#c07090', '--text3': '#7a4060', '--accent': '#f472b6', '--accent2': '#fb923c' },
  slate:    { label: 'Slate',    bg: '#1c1c2e', '--bg': '#1c1c2e', '--bg2': '#252540', '--bg3': '#2e2e52', '--border': '#3a3a60', '--text': '#e0e0f8', '--text2': '#8888c0', '--text3': '#5555a0', '--accent': '#a78bfa', '--accent2': '#34d399' },
  warm:     { label: 'Warm',     bg: '#1f1a0e', '--bg': '#1f1a0e', '--bg2': '#2a2214', '--bg3': '#362c1a', '--border': '#4a3c22', '--text': '#f4ead0', '--text2': '#b09060', '--text3': '#706040', '--accent': '#f59e0b', '--accent2': '#f87171' },
  arctic:   { label: 'Arctic',   bg: '#e8f4f8', '--bg': '#e8f4f8', '--bg2': '#ffffff', '--bg3': '#d8eef8', '--border': '#b0d4e8', '--text': '#0d2030', '--text2': '#406080', '--text3': '#8090a8', '--accent': '#0ea5e9', '--accent2': '#e879f9' },
};

function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme)) {
    if (k.startsWith('--')) root.style.setProperty(k, v);
  }
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === name);
  });
}

function buildSwatches() {
  const container = document.getElementById('themeSwatches');
  container.innerHTML = Object.entries(THEMES).map(([key, t]) => `
    <button class="swatch" data-theme="${key}" title="${t.label}">
      <span class="swatch-circle" style="background:${t.bg}"></span>
      <span class="swatch-label">${t.label}</span>
    </button>
  `).join('');
}

function saveTheme(patch) {
  const existing = JSON.parse(localStorage.getItem('tabkeeper-theme') || '{}');
  localStorage.setItem('tabkeeper-theme', JSON.stringify({ ...existing, ...patch }));
}

function initTheme() {
  buildSwatches();

  const saved = JSON.parse(localStorage.getItem('tabkeeper-theme') || '{}');
  applyTheme(saved.theme || 'dark');

  document.getElementById('themeSwatches').addEventListener('click', e => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    applyTheme(btn.dataset.theme);
    saveTheme({ theme: btn.dataset.theme });
  });

  const panel = document.getElementById('themePanel');
  document.getElementById('themeBtn').addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });
  document.getElementById('themePanelClose').addEventListener('click', () => {
    panel.classList.add('hidden');
  });
  document.addEventListener('click', e => {
    if (!panel.classList.contains('hidden') &&
        !panel.contains(e.target) &&
        e.target.id !== 'themeBtn') {
      panel.classList.add('hidden');
    }
  });
}

document.addEventListener('DOMContentLoaded', initTheme);
