const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { test } = require('node:test');

const repo = path.join(__dirname, '..');

// image-library.ts é TypeScript: viramos CJS com o esbuild que já vem do Vite.
function loadImageLibraryModule() {
  const outfile = path.join(
    repo,
    'node_modules',
    '.cache',
    'equip-control-tests',
    'image-library.cjs',
  );

  esbuild.buildSync({
    entryPoints: [path.join(repo, 'frontend', 'src', 'lib', 'image-library.ts')],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
  });

  return require(outfile);
}

// 'Câmera vermelha' tem 2 registros mas vem depois, porque a ordem é alfabética.
const cameras = [
  { id: 'cam-1', name: 'Câmera vermelha', department: 'hardware', image: '/uploads/images/camera-vermelha.jpg' },
  { id: 'cam-2', name: 'Câmera vermelha', department: 'hardware', image: 'uploads/images/camera-vermelha.jpg' },
  { id: 'cam-3', name: 'Camera completa de aplicação 4 MP', department: 'hardware', image: '/uploads/images/camera.jpg' },
];

test('catalogo tem uma entrada por arquivo e vem em ordem alfabetica', () => {
  const { existingImages } = loadImageLibraryModule();

  const catalog = existingImages(cameras);

  assert.equal(catalog.length, 2, 'camera-vermelha.jpg aparece uma vez mesmo gravado com e sem barra');
  assert.deepEqual(
    catalog.map((i) => [i.label, i.count]),
    [
      ['Camera completa de aplicação 4 MP', 1],
      ['Câmera vermelha', 2],
    ],
    'ordem pelo nome do equipamento, nao pela quantidade',
  );
  assert.equal(catalog[1].path, '/uploads/images/camera-vermelha.jpg', 'o caminho gravado e o que a API devolve');
  assert.deepEqual(catalog[1].owners, ['Câmera vermelha']);
});

test('ordem alfabetica ignora acento e ordena numero', () => {
  const { existingImages } = loadImageLibraryModule();

  const catalog = existingImages([
    { id: 'a', name: 'Notebook 10 polegadas', department: 'hardware', image: '/uploads/images/n10.jpg' },
    { id: 'b', name: 'Notebook 2 polegadas', department: 'hardware', image: '/uploads/images/n2.jpg' },
    { id: 'c', name: 'Abóbada do observatório', department: 'imobiliário', image: '/uploads/images/abobada.jpg' },
    { id: 'd', name: 'monitor', department: 'hardware', image: '/uploads/images/monitor.jpg' },
  ]);

  assert.deepEqual(catalog.map((i) => i.label), [
    'Abóbada do observatório',
    'monitor',
    'Notebook 2 polegadas',
    'Notebook 10 polegadas',
  ]);
});

test('rotulo nao depende da ordem em que o banco devolve os registros', () => {
  const { existingImages } = loadImageLibraryModule();

  const shared = '/uploads/images/mesma.jpg';
  const first = existingImages([
    { id: 'x', name: 'Zebra de laboratório', department: 'hardware', image: shared },
    { id: 'y', name: 'Aparelho de medição', department: 'hardware', image: shared },
  ]);
  const reversed = existingImages([
    { id: 'y', name: 'Aparelho de medição', department: 'hardware', image: shared },
    { id: 'x', name: 'Zebra de laboratório', department: 'hardware', image: shared },
  ]);

  assert.equal(first[0].label, 'Aparelho de medição');
  assert.deepEqual(
    [first.map((i) => i.label), first.map((i) => i.count)],
    [reversed.map((i) => i.label), reversed.map((i) => i.count)],
  );
});

test('data URL legado e registro sem imagem ficam fora do catalogo', () => {
  const { existingImages } = loadImageLibraryModule();

  const catalog = existingImages([
    { id: 'a', name: 'Legado', department: 'hardware', image: 'data:image/png;base64,AAAA' },
    { id: 'b', name: 'Sem imagem', department: 'hardware', image: '' },
    { id: 'c', name: 'Sem campo', department: 'hardware' },
    { id: 'd', name: 'Termo', department: 'hardware', term: '/uploads/terms/x.pdf', image: null },
  ]);

  assert.deepEqual(catalog, []);
});

test('filtro pega nome do arquivo e nome do equipamento, sem acento', () => {
  const { existingImages, filterImages } = loadImageLibraryModule();

  const catalog = existingImages([
    ...cameras,
    { id: 'cam-4', name: 'Abóbada do Observatório', department: 'imobiliário', image: '/uploads/images/observatorio.jpg' },
  ]);

  assert.deepEqual(filterImages(catalog, 'camera').map((i) => i.filename), ['camera.jpg', 'camera-vermelha.jpg']);
  assert.deepEqual(filterImages(catalog, 'observat').map((i) => i.filename), ['observatorio.jpg']);
  assert.deepEqual(filterImages(catalog, '   ').map((i) => i.filename), catalog.map((i) => i.filename));
  assert.deepEqual(filterImages(catalog, 'inexistente'), []);
});
