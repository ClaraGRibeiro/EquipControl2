const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// Guarda de ordem das rotas estáticas de server.js. O fallback do front-end é um
// curinga: qualquer arquivo servido direto do disco que for registrado depois dele
// vira HTML (foi assim que /template.pdf quebrou o termo com "No PDF header found").
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

const at = (needle) => {
  const index = source.indexOf(needle);
  assert.ok(index !== -1, `server.js precisa conter: ${needle}`);
  return index;
};

test('/template.pdf tem rota própria e vem antes do fallback do front-end', () => {
  assert.ok(at("app.get('/template.pdf'") < at("app.get('*'"), '/template.pdf precisa ser resolvido antes do curinga');
});

test('uploads são publicados antes do front-end compilado', () => {
  const uploads = at("app.use('/uploads/terms'");
  const images = at("app.use('/uploads/images'");
  assert.ok(uploads < images, 'a ordem dos dois mounts de uploads importa pouco, mas ambos vêm juntos');
  assert.ok(images < at('express.static(frontendDist)'), 'uploads não podem ser escondidos pelo build do front-end');
});

test('o modelo do termo é lido do arquivo da raiz, não do build', () => {
  assert.ok(/sendFile\(path\.join\(__dirname, 'template\.pdf'\)/.test(source), 'a rota deve apontar para template.pdf na raiz');
});

test('edição e exclusão descobrem quem mais usa o arquivo antes de mexer nele', () => {
  // A contagem de usuários precisa ser feita com o banco ainda intacto: depois do
  // UPDATE/DELETE o arquivo compartilhado parece órfão e sai de uploads/.
  assert.ok(at('const keep = await assetsInUse([id]);') < at('UPDATE equipments SET name=?'), 'a edição consulta antes do UPDATE');
  assert.ok(at('const keep = await assetsInUse(ids);') < at('DELETE FROM equipments'), 'a exclusão consulta antes do DELETE');
  assert.ok(/trashReplacedAssets\([\s\S]{0,400}?\{ keep \}/.test(source), 'a edição repassa a lista de arquivos a preservar');
  assert.ok(source.includes('trashAssets(rows, trashId, { keep })'), 'a exclusão repassa a lista de arquivos a preservar');
});
