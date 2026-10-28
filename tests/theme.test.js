const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { test } = require('node:test');

const repo = path.join(__dirname, '..');

// theme.ts é TypeScript: viramos CJS com o esbuild que já vem do Vite.
function loadThemeModule() {
  const outfile = path.join(
    repo,
    'node_modules',
    '.cache',
    'equip-control-tests',
    'theme.cjs',
  );

  esbuild.buildSync({
    entryPoints: [path.join(repo, 'frontend', 'src', 'lib', 'theme.ts')],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
  });

  return require(outfile);
}

test('tema salvo vence a preferência do sistema', () => {
  const { resolveTheme } = loadThemeModule();

  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});

test('sem escolha salva usa o sistema e o padrão é claro', () => {
  const { resolveTheme } = loadThemeModule();

  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  // valor corrompido/inesperado não pode quebrar o app
  assert.equal(resolveTheme('verde', true), 'dark');
  assert.equal(resolveTheme(undefined, false), 'light');
});

test('a chave do tema é única e usada no boot inline do index.html', () => {
  const { THEME_STORAGE_KEY } = loadThemeModule();
  const html = fs.readFileSync(path.join(repo, 'frontend', 'index.html'), 'utf8');

  assert.equal(THEME_STORAGE_KEY, 'equipcontrol-theme');
  assert.ok(
    html.includes(`localStorage.getItem("${THEME_STORAGE_KEY}")`),
    'o script inline precisa ler a mesma chave, senão o tema piscaria ao abrir',
  );
  assert.ok(html.includes('prefers-color-scheme: dark'), 'respeita a preferência do sistema');
  assert.ok(/classList\.toggle\(\s*["']dark["']/.test(html), 'aplica .dark antes da primeira pintura');
});

test('o tema escuro define todos os tokens usados pelos componentes', () => {
  const css = fs.readFileSync(path.join(repo, 'frontend', 'src', 'index.css'), 'utf8');
  const darkBlock = /\.dark\s*\{([^}]*)\}/.exec(css)?.[1] || '';

  for (const token of ['--background', '--foreground', '--card', '--primary', '--secondary', '--muted', '--accent', '--destructive', '--border', '--input', '--ring']) {
    assert.ok(darkBlock.includes(token), `.dark precisa definir ${token}`);
  }

  assert.ok(darkBlock.includes('color-scheme:dark'), 'controles nativos (select, scroll) seguem o tema');
});
