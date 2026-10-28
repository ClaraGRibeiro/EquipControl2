const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

const {
  validateTermResponsavel,
} = require(path.join(__dirname, '..', 'validation.js'));

const SEM_RESPONSAVEL = /precisa de um responsável/;

// Regra antiga exigia os dois juntos; responsável sozinho voltava com erro.
test('responsável sem termo é permitido (termo anexado depois)', () => {
  assert.equal(
    validateTermResponsavel({ term: '', responsavel: 'Clara Ribeiro' }),
    '',
  );
  assert.equal(
    validateTermResponsavel({ term: undefined, responsavel: '  Clara Ribeiro ' }),
    '',
  );
});

test('termo novo sem responsável é recusado', () => {
  assert.match(
    validateTermResponsavel({ term: '/uploads/terms/abc.pdf', responsavel: '' }),
    SEM_RESPONSAVEL,
  );
  assert.match(
    validateTermResponsavel({
      term: 'data:application/pdf;base64,AAAA',
      responsavel: '   ',
    }),
    SEM_RESPONSAVEL,
  );
  assert.match(
    validateTermResponsavel({ term: '/uploads/terms/abc.pdf' }),
    SEM_RESPONSAVEL,
  );
});

test('sem responsável e sem termo passa normalmente', () => {
  assert.equal(validateTermResponsavel({}), '');
  assert.equal(validateTermResponsavel({ term: '', responsavel: '' }), '');
});

test('termo em branco não conta como termo', () => {
  assert.equal(validateTermResponsavel({ term: '   ', responsavel: '' }), '');
  assert.equal(validateTermResponsavel({ term: null, responsavel: null }), '');
});

// Registros antigos têm PDF sem responsável: editar (até só o status) não pode falhar.
test('termo que já estava salvo sem responsável continua válido (legado)', () => {
  assert.equal(
    validateTermResponsavel({
      term: '/uploads/terms/teste.pdf',
      responsavel: '',
      previous: { term: '/uploads/terms/teste.pdf', responsavel: null },
    }),
    '',
  );
});

test('registro que tinha responsável não pode ficar com o termo órfão', () => {
  assert.match(
    validateTermResponsavel({
      term: '/uploads/terms/teste.pdf',
      responsavel: '',
      previous: { term: '/uploads/terms/teste.pdf', responsavel: 'Clara Ribeiro' },
    }),
    SEM_RESPONSAVEL,
  );
});

test('substituir o termo de um registro legado exige responsável', () => {
  assert.match(
    validateTermResponsavel({
      term: 'data:application/pdf;base64,BBBB',
      responsavel: '',
      previous: { term: '/uploads/terms/teste.pdf', responsavel: '' },
    }),
    SEM_RESPONSAVEL,
  );
});

test('criação (sem previous) é sempre estrita', () => {
  assert.match(
    validateTermResponsavel({
      term: '/uploads/terms/teste.pdf',
      responsavel: '   ',
      previous: undefined,
    }),
    SEM_RESPONSAVEL,
  );
});
