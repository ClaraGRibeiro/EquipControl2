const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, beforeEach, afterEach } = require('node:test');

const { createAssetStore, isTrashBatchId, sharedAssetKeys, assetKey } = require('../assets');

const PDF_BASE64 = Buffer.from('%PDF-1.4 equipcontrol termo de teste').toString('base64');
const IMAGE_BASE64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');

let root;
let store;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'equipcontrol-assets-'));
  store = createAssetStore({ uploadsRoot: root, trashTtlMs: 15 * 60 * 1000 });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function writeActive(kind, filename, content = 'arquivo') {
  fs.writeFileSync(path.join(store.dirs[kind], filename), content);
  return `/uploads/${kind}/${filename}`;
}

test('salva o Data URL do termo e devolve o caminho público', async () => {
  const saved = await store.saveDataUrl(`data:application/pdf;base64,${PDF_BASE64}`, 'terms');

  assert.match(saved, /^\/uploads\/terms\/[0-9a-f-]{36}\.pdf$/);
  assert.equal(fs.existsSync(store.localPath(saved, 'terms')), true);
});

test('rejeita termo que não é PDF', async () => {
  await assert.rejects(
    () => store.saveDataUrl('data:application/pdf;base64,JU5PVEElMFBESQ==', 'terms'),
    /n\xE3o parece ser um PDF v\xE1lido/,
  );
});

test('mantém caminhos já gravados, com ou sem barra inicial, sem regravar', async () => {
  const current = writeActive('terms', 'atual.pdf');
  const legacy = writeActive('terms', 'legado.pdf');

  assert.equal(await store.saveDataUrl(current, 'terms'), current);
  assert.equal(await store.saveDataUrl(legacy.replace(/^\//, ''), 'terms'), legacy.replace(/^\//, ''));
});

test('apagar registro move termo e imagem para a lixeira e esvazia uploads', async () => {
  const term = writeActive('terms', 'equip-1.pdf');
  const image = writeActive('images', 'equip-1.jpg');
  const trashId = store.newTrashBatch();

  const result = await store.trashAssets([{ id: 'equip-1', term, image }], trashId);

  assert.deepEqual(result, { trashed: 2, missing: 0, kept: 0 });
  assert.equal(fs.existsSync(store.localPath(term, 'terms')), false);
  assert.equal(fs.existsSync(store.localPath(image, 'images')), false);
  assert.equal(fs.existsSync(path.join(store.trashRoot, trashId, 'terms', 'equip-1.pdf')), true);
  assert.equal(fs.existsSync(path.join(store.trashRoot, trashId, 'images', 'equip-1.jpg')), true);
});

test('imagem usada por outro registro continua em uploads quando um é apagado', async () => {
  const shared = writeActive('images', 'images (1).jpg');
  const trashId = store.newTrashBatch();
  const allRows = [{ id: 'a', image: shared }, { id: 'b', image: shared.replace(/^\//, '') }];

  // O banco ainda tem as duas linhas: 'a' está sendo apagada, 'b' continua usando.
  const keep = sharedAssetKeys(allRows, ['a']);
  const result = await store.trashAssets([allRows[0]], trashId, { keep });

  assert.deepEqual(result, { trashed: 0, missing: 0, kept: 1 });
  assert.equal(fs.existsSync(store.localPath(shared, 'images')), true, 'o arquivo fica onde está');
  assert.equal(fs.existsSync(path.join(store.trashRoot, trashId)), false, 'nem lote de lixeira é criado');
});

test('apagar o último registro que usava o arquivo manda ele para a lixeira', async () => {
  const shared = writeActive('images', 'images (2).jpg');
  const rows = [{ id: 'a', image: shared }, { id: 'b', image: shared }];

  // 'a' sai primeiro e 'b' ainda aponta para o mesmo arquivo: nada se move.
  const first = await store.trashAssets([rows[0]], store.newTrashBatch(), {
    keep: sharedAssetKeys(rows, ['a']),
  });
  assert.deepEqual(first, { trashed: 0, missing: 0, kept: 1 });
  assert.equal(fs.existsSync(store.localPath(shared, 'images')), true);

  // Agora 'b' também saiu: sem nenhum outro usuário, o arquivo vai para a lixeira.
  const secondBatch = store.newTrashBatch();
  const second = await store.trashAssets([rows[1]], secondBatch, {
    keep: sharedAssetKeys(rows, ['a', 'b']),
  });
  assert.deepEqual(second, { trashed: 1, missing: 0, kept: 0 });
  assert.equal(fs.existsSync(store.localPath(shared, 'images')), false);
  assert.equal(fs.existsSync(path.join(store.trashRoot, secondBatch, 'images', 'images (2).jpg')), true);
});

test('editar um registro tirando a imagem compartilhada não move o arquivo', async () => {
  const shared = writeActive('images', 'images (3).jpg');
  const keep = sharedAssetKeys([{ id: 'a', image: shared }, { id: 'b', image: shared }], ['a']);

  const result = await store.trashReplacedAssets(
    { id: 'a', before: { image: shared }, after: { image: '' } },
    store.newTrashBatch(),
    { keep },
  );

  assert.deepEqual(result, { trashId: '', trashed: 0, missing: 0, kept: 1 });
  assert.equal(fs.existsSync(store.localPath(shared, 'images')), true);
  assert.equal(fs.readdirSync(store.trashRoot).length, 0, 'nenhum lote de lixeira é criado');
});

test('removeFile preserva o arquivo que outro registro ainda usa', async () => {
  const shared = writeActive('images', 'images (4).jpg');
  const keep = sharedAssetKeys([{ id: 'a', image: shared }, { id: 'b', image: shared }], ['a']);

  assert.equal(await store.removeFile(shared, 'images', { keep }), false);
  assert.equal(fs.existsSync(store.localPath(shared, 'images')), true);
  assert.equal(await store.removeFile(shared, 'images'), true);
  assert.equal(fs.existsSync(store.localPath(shared, 'images')), false);
});

test('contagem de usuários do arquivo ignora o registro alterado e Data URL', () => {
  const rows = [
    { id: 'a', term: '/uploads/terms/x.pdf', image: 'uploads/images/y.jpg' },
    { id: 'b', term: '', image: '/uploads/images/y.jpg' },
    { id: 'c', term: 'data:application/pdf;base64,JVBERi0x', image: '' },
  ];

  // Só conta quem fica: 'a' está sendo alterado, 'c' tem termo em Base64 antigo.
  assert.deepEqual([...sharedAssetKeys(rows, ['a'])], ['images/y.jpg']);
  assert.deepEqual([...sharedAssetKeys(rows, ['b'])], ['terms/x.pdf', 'images/y.jpg']);
  assert.deepEqual([...sharedAssetKeys(rows, ['a', 'b'])], []);

  // O mesmo arquivo gravado com ou sem barra inicial é a mesma chave.
  assert.equal(assetKey('uploads/images/y.jpg', 'images'), 'images/y.jpg');
  assert.equal(assetKey('/uploads/images/y.jpg', 'images'), 'images/y.jpg');
  assert.equal(assetKey('data:image/png;base64,AAA', 'images'), '');
  // tipo errado não conta: imagem não segura termo e vice-versa.
  assert.equal(sharedAssetKeys([{ id: 'z', term: '/uploads/images/y.jpg' }], []).size, 0);
});

test('registros sem anexo ou com caminho sem arquivo não quebram o apagamento', async () => {
  const missing = writeActive('terms', 'existe.pdf');
  fs.rmSync(store.localPath(missing, 'terms'));

  const result = await store.trashAssets(
    [{ id: 'a', term: missing, image: '' }, { id: 'b', term: '', image: '' }],
    store.newTrashBatch(),
  );

  assert.deepEqual(result, { trashed: 0, missing: 1, kept: 0 });
});

test('desfazer devolve os arquivos da lixeira para uploads', async () => {
  const term = writeActive('terms', 'volta.pdf');
  const image = writeActive('images', 'volta.jpg');
  const trashId = store.newTrashBatch();
  await store.trashAssets([{ id: 'equip-2', term, image }], trashId);

  const lost = await store.restoreAssets([{ id: 'equip-2', term, image }], trashId);

  assert.deepEqual(lost, []);
  assert.equal(fs.existsSync(store.localPath(term, 'terms')), true);
  assert.equal(fs.existsSync(store.localPath(image, 'images')), true);
});

test('desfazer limpa o campo quando o arquivo não está mais na lixeira', async () => {
  const term = writeActive('terms', 'sumido.pdf');
  const trashId = store.newTrashBatch();
  await store.trashAssets([{ id: 'equip-3', term }], trashId);
  fs.rmSync(path.join(store.trashRoot, trashId, 'terms', 'sumido.pdf'));

  const items = [{ id: 'equip-3', term }];
  const lost = await store.restoreAssets(items, trashId);

  assert.deepEqual(lost, [{ id: 'equip-3', field: 'term' }]);
  assert.equal(items[0].term, '');
});

test('purge apaga a lixeira em definitivo', async () => {
  writeActive('terms', 'definitivo.pdf');
  const trashId = store.newTrashBatch();
  await store.trashAssets([{ id: 'equip-4', term: '/uploads/terms/definitivo.pdf' }], trashId);

  assert.equal(await store.purgeTrash(trashId), 1);
  assert.equal(fs.existsSync(path.join(store.trashRoot, trashId)), false);
});

test('varredura remove apenas lotes mais velhos que o tempo de guarda', async () => {
  const oldBatch = store.newTrashBatch();
  const recentBatch = store.newTrashBatch();
  writeActive('terms', 'velho.pdf');
  writeActive('terms', 'novo.pdf');
  await store.trashAssets([{ id: 'old', term: '/uploads/terms/velho.pdf' }], oldBatch);
  await store.trashAssets([{ id: 'new', term: '/uploads/terms/novo.pdf' }], recentBatch);

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  fs.utimesSync(path.join(store.trashRoot, oldBatch), hourAgo, hourAgo);

  assert.equal(await store.sweepTrash(), 1);
  assert.equal(fs.existsSync(path.join(store.trashRoot, oldBatch)), false);
  assert.equal(fs.existsSync(path.join(store.trashRoot, recentBatch)), true);
  assert.equal(fs.existsSync(path.join(store.trashRoot, recentBatch, 'terms', 'novo.pdf')), true);
  assert.equal(fs.existsSync(path.join(store.dirs.terms, 'velho.pdf')), false);
});

test('identificador de lixeira forjado não escreve fora de uploads', async () => {
  const term = writeActive('terms', 'seguro.pdf');

  for (const bad of ['../..', '..', 'x/../../etc', '']) {
    await assert.rejects(() => store.trashAssets([{ id: 'e', term }], bad), /lixeira inv\xE1lido/);
  }
  assert.equal(fs.existsSync(store.localPath(term, 'terms')), true);
});

test('caminho malicioso na coluna do banco não escapa da pasta do tipo', () => {
  const escaped = store.localPath('/uploads/terms/../../../../windows/system32/config/sam', 'terms');

  assert.equal(escaped, path.join(store.dirs.terms, 'sam'));
});

test('apenas UUID é aceito como identificador de lixeira', async () => {
  assert.equal(isTrashBatchId(store.newTrashBatch()), true);
  for (const bad of ['../../etc', '1', '', null, undefined, 'x'.repeat(36)]) {
    assert.equal(isTrashBatchId(bad), false);
  }
  await assert.rejects(() => store.purgeTrash('../../etc'), /lixeira inv\xE1lido/);
});

test('edição que remove ou troca anexo tira o arquivo antigo de uploads', async () => {
  const oldTerm = writeActive('terms', 'antigo.pdf');
  const oldImage = writeActive('images', 'antigo.jpg');
  const newTerm = writeActive('terms', 'novo.pdf');
  const trashId = store.newTrashBatch();

  const result = await store.trashReplacedAssets(
    {
      id: 'equip-1',
      before: { term: oldTerm, image: oldImage },
      after: { term: newTerm, image: '' },
    },
    trashId,
  );

  assert.deepEqual(result, { trashId, trashed: 2, missing: 0, kept: 0 });
  assert.equal(fs.existsSync(store.localPath(oldTerm, 'terms')), false);
  assert.equal(fs.existsSync(store.localPath(oldImage, 'images')), false);
  assert.equal(fs.existsSync(store.localPath(newTerm, 'terms')), true);
  assert.equal(fs.existsSync(path.join(store.trashRoot, trashId, 'terms', 'antigo.pdf')), true);
});

test('edição que não mexe no anexo deixa o arquivo em uploads', async () => {
  const term = writeActive('terms', 'em-uso.pdf');
  const image = writeActive('images', 'em-uso.jpg');

  const result = await store.trashReplacedAssets(
    {
      id: 'equip-1',
      before: { term, image },
      after: { term: term.replace(/^\//, ''), image },
    },
    store.newTrashBatch(),
  );

  assert.deepEqual(result, { trashId: '', trashed: 0, missing: 0, kept: 0 });
  assert.equal(fs.existsSync(store.localPath(term, 'terms')), true);
  assert.equal(fs.existsSync(store.localPath(image, 'images')), true);
  assert.equal(fs.readdirSync(store.trashRoot).length, 0);
});

test('desfazer a remoção devolve o arquivo para uploads e o purge fecha o lote', async () => {
  const term = writeActive('terms', 'desfazer.pdf');
  const image = writeActive('images', 'desfazer.jpg');
  const trashId = store.newTrashBatch();

  await store.trashReplacedAssets(
    { id: 'equip-1', before: { term, image }, after: { term: '', image: '' } },
    trashId,
  );
  const lost = await store.restoreAssets([{ id: 'equip-1', term, image }], trashId);

  assert.deepEqual(lost, []);
  assert.equal(fs.existsSync(store.localPath(term, 'terms')), true);
  assert.equal(fs.existsSync(store.localPath(image, 'images')), true);
  assert.equal(await store.purgeTrash(trashId), 1);
  assert.equal(fs.readdirSync(store.trashRoot).length, 0);
});

test('arquivo que já saiu da lixeira é reportado como perdido e limpo do item', async () => {
  const term = writeActive('terms', 'perdido.pdf');
  const trashId = store.newTrashBatch();

  await store.trashReplacedAssets({ id: 'equip-1', before: { term }, after: { term: '' } }, trashId);
  fs.rmSync(path.join(store.trashRoot, trashId, 'terms', 'perdido.pdf'));

  const item = { id: 'equip-1', term };
  const lost = await store.restoreAssets([item], trashId);

  assert.deepEqual(lost, [{ id: 'equip-1', field: 'term' }]);
  assert.equal(item.term, '');
});
