const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { test } = require('node:test');

const repo = path.join(__dirname, '..');

// format.ts é TypeScript: viramos CJS com o esbuild que já vem do Vite.
function loadFormatModule() {
  const outfile = path.join(
    repo,
    'node_modules',
    '.cache',
    'equip-control-tests',
    'format.cjs',
  );

  esbuild.buildSync({
    entryPoints: [path.join(repo, 'frontend', 'src', 'lib', 'format.ts')],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
  });

  return require(outfile);
}

const longName =
  'notebook_alienware_16x_aurora_16_core_ultra_9_275hx_32gb_nvidia_rtx_5060_1tb_sdd_7587_1_afd07e2895a7e2d2acae58e1a39e8231.webp';

test('nome de arquivo longo é cortado no meio, mantendo extensão e título', () => {
  const { shortFileName } = loadFormatModule();

  const short = shortFileName(longName);

  assert.ok(longName.length > 100, 'a amostra precisa ser maior que o limite');
  assert.equal(short.length, 44);
  assert.ok(short.startsWith('notebook_alienware_16x_aurora'), 'começo preservado');
  assert.ok(short.endsWith('.webp'), 'extensão preservada');
  assert.ok(short.includes('...'), 'corte indicado');
});

test('nome que já cabe volta intacto', () => {
  const { shortFileName } = loadFormatModule();

  assert.equal(shortFileName('termo-de-compromisso.pdf'), 'termo-de-compromisso.pdf');
  assert.equal(shortFileName('a'.repeat(44)), 'a'.repeat(44));
  assert.equal(shortFileName('   '), '');
});

test('limite customizado reduz ainda mais o nome', () => {
  const { shortFileName } = loadFormatModule();

  const short = shortFileName(longName, 24);

  assert.equal(short.length, 24);
  assert.ok(short.endsWith('.webp'));
});

test('data do registro aparece legível em pt-BR', () => {
  const { dateTime } = loadFormatModule();

  // Sem fuso na amostra: o Date é lido no horário local, então o resultado é estável.
  const text = dateTime('2026-02-03T10:30:00');
  assert.ok(text.startsWith('03/02/2026'), `esperado dd/mm/aaaa, veio ${text}`);
  assert.ok(text.includes('10:30'), 'hora:minuto visíveis');
  assert.equal(dateTime(''), '');
  assert.equal(dateTime(undefined), '');
  assert.equal(dateTime('banana'), 'banana', 'valor imprestável volta como veio');
});

test('nome do arquivo vem do caminho salvo em term/image', () => {
  const { fileName } = loadFormatModule();

  assert.equal(fileName('/uploads/terms/termo-abc.pdf'), 'termo-abc.pdf');
  assert.equal(
    fileName('uploads/images/nota%20quebrada (1).jpg'),
    'nota quebrada (1).jpg',
  );
  assert.equal(fileName('C:\\uploads\\terms\\x.pdf'), 'x.pdf');
  assert.equal(fileName(''), '');
  assert.equal(fileName(undefined), '');
  assert.equal(fileName('%E2'), '%E2', 'escape quebrado não derruba o modal');
});
