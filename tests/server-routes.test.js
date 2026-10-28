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
