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

const cameras = [
  { id: 'cam-1', name: 'Camera completa de aplicação 4 MP', department: 'hardware', image: '/uploads/images/camera.jpg' },
  { id: 'cam-2', name: 'Camera completa de aplicação 4 MP', department: 'hardware', image: 'uploads/images/camera.jpg' },
  { id: 'cam-3', name: 'Camera vermelha', department: 'hardware', image: '/uploads/images/camera-vermelha.jpg' },
];

test('catalogo de imagens reaproveitaveis tem uma entrada por arquivo', () => {
  const { existingImages } = loadImageLibraryModule();

  const catalog = existingImages(cameras);

  assert.equal(catalog.length, 2, 'camera.jpg aparece uma vez mesmo gravado com e sem barra');
  assert.deepEqual(
    catalog.map((i) => [i.filename, i.count]),
    [['camera.jpg', 2], ['camera-vermelha.jpg', 1]],
    'as mais usadas primeiro',
  );
  assert.equal(catalog[0].path, '/uploads/images/camera.jpg', 'o caminho gravado e o que a API devolve');
  assert.deepEqual(catalog[0].owners, ['Camera completa de aplicação 4 MP']);
  assert.deepEqual(catalog[1].owners, ['Camera vermelha']);
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

  const catalog = existingImages([...cameras, { id: 'cam-4', name: 'Abóbada do Observatório', department: 'hardware', image: '/uploads/images/observatorio.jpg' }]);

  assert.deepEqual(filterImages(catalog, 'camera').map((i) => i.filename), ['camera.jpg', 'camera-vermelha.jpg']);
  assert.deepEqual(filterImages(catalog, 'observat').map((i) => i.filename), ['observatorio.jpg']);
  assert.deepEqual(filterImages(catalog, '   ').map((i) => i.filename), catalog.map((i) => i.filename));
  assert.deepEqual(filterImages(catalog, 'inexistente'), []);
});
