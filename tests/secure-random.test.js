const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');
const { test } = require('node:test');

const repo = path.join(__dirname, '..');

// Os dois módulos rodam no navegador; para testar em Node viramos CJS com o
// esbuild que já vem do Vite.
function loadLib(name) {
  const outfile = path.join(
    repo,
    'node_modules',
    '.cache',
    'equip-control-tests',
    `${name}.cjs`,
  );

  esbuild.buildSync({
    entryPoints: [path.join(repo, 'frontend', 'src', 'lib', `${name}.ts`)],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    logLevel: 'silent',
  });

  return require(outfile);
}

// Crypto de contexto inseguro: só getRandomValues, sem randomUUID, como o
// navegador entrega em http://192.168.x.x. O getRandomValues exige o próprio
// objeto como receiver, igual ao navegador: chamar sem this dá "Illegal
// invocation", e é justamente isso que o teste abaixo não pode deixar voltar.
const insecureCrypto = () => {
  const fake = {
    getRandomValues(buffer) {
      if (this !== fake) throw new TypeError('Illegal invocation');
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    },
  };

  return fake;
};

// Em Node, globalThis.crypto é definido como propriedade não gravável: trocar o
// valor exige defineProperty (é assim que simulamos o contexto inseguro).
const withCrypto = (replacement, run) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  try {
    Object.defineProperty(globalThis, 'crypto', {
      value: replacement,
      configurable: true,
      writable: true,
    });
    return run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete globalThis.crypto;
  }
};

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('contexto inseguro ganha crypto.randomUUID a partir de getRandomValues', () => {
  withCrypto(insecureCrypto(), () => {
    const { ensureRandomUuid } = loadLib('secure-random');

    assert.equal(ensureRandomUuid(), true, 'o shim precisa ser instalado');
    assert.match(globalThis.crypto.randomUUID(), UUID_V4);

    const ids = new Set(
      Array.from({ length: 50 }, () => globalThis.crypto.randomUUID()),
    );
    assert.equal(ids.size, 50, 'nada de uuid repetido');
  });
});

test('newEquipmentId continua funcionando em http por IP de rede', () => {
  withCrypto(insecureCrypto(), () => {
    // require executa o módulo, e id.ts instala o shim na importação.
    const { newEquipmentId } = loadLib('id');

    const ids = Array.from({ length: 30 }, () => newEquipmentId());

    ids.forEach((id) => {
      assert.match(id, /^[0-9a-z]+-[0-9a-f]{8}$/);
      assert.ok(id.length <= 50, 'id precisa caber em equipments.id VARCHAR(50)');
    });
    assert.equal(new Set(ids).size, 30);
  });
});

test('contexto seguro não é alterado', () => {
  const { ensureRandomUuid } = loadLib('secure-random');
  const original = globalThis.crypto.randomUUID;

  assert.equal(ensureRandomUuid(), false, 'nada a instalar quando randomUUID existe');
  assert.equal(globalThis.crypto.randomUUID, original, 'randomUUID nativo preservado');
  assert.match(globalThis.crypto.randomUUID(), UUID_V4);
});
