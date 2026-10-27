const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const scriptPath = path.join(__dirname, '..', 'scripts', 'new-id.mjs');
const frontendPath = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'id.ts');

// O gerador roda em ESM; aqui entra por import dinâmico porque os testes são CJS.
const loadGenerator = () => import(pathToFileURL(scriptPath).href);

const generatorExpression = (source) =>
  (source.replace(/crypto\./g, '').match(/`\$\{Date\.now\(\)\.toString\(36\)\}-\$\{[^}]*\}`/) || [''])[0];

test('gera id no mesmo formato do cadastro em tela', async () => {
  const { newEquipmentId } = await loadGenerator();
  const id = newEquipmentId();

  assert.match(id, /^[0-9a-z]+-[0-9a-f]{8}$/);
  assert.ok(id.length <= 50, 'id precisa caber em equipments.id VARCHAR(50)');
});

test('ids gerados em sequência não se repetem', async () => {
  const { newEquipmentId } = await loadGenerator();
  const ids = new Set(Array.from({ length: 50 }, newEquipmentId));

  assert.equal(ids.size, 50);
});

test('script e front-end usam exatamente o mesmo cálculo de id', async () => {
  const fromScript = generatorExpression(fs.readFileSync(scriptPath, 'utf8'));
  const fromFrontend = generatorExpression(fs.readFileSync(frontendPath, 'utf8'));

  assert.ok(fromScript, 'o script precisa manter o cálculo explícito do id');
  assert.equal(fromScript, fromFrontend);
});

test('monta o INSERT com o id gerado e sem created_at', async () => {
  const { buildInsert, parseArgs } = await loadGenerator();
  const values = parseArgs([
    '--sql',
    '--name',
    "NOBREAK RAGTECH SENOIDAL NEP 3200VA C/B'T 115V",
    '--department',
    'hardware',
    '--value',
    '2100',
    '--quantity',
    '1',
    '--project',
    'Observatório Do Transportes Do Estado De Minas Gerais',
  ]);

  const sql = buildInsert('mvsample-1a2b3c4d', values);

  assert.ok(sql.startsWith("INSERT INTO equipments (id, name, department, value, quantity, status, patrimonio, responsavel, term, image, project)"));
  assert.ok(sql.includes("'mvsample-1a2b3c4d'"));
  assert.ok(sql.includes("'NOBREAK RAGTECH SENOIDAL NEP 3200VA C/B''T 115V'"));
  assert.ok(sql.includes("'hardware', 2100, 1, 'Guardado', '', '', '', '', 'Observatório Do Transportes Do Estado De Minas Gerais'"));
  assert.ok(!sql.includes('created_at'), 'created_at fica para o DEFAULT CURRENT_TIMESTAMP');
});

test('parseArgs aplica padrões e recusa opções inválidas', async () => {
  const { parseArgs } = await loadGenerator();

  assert.deepEqual(
    { ...parseArgs(['Gerador 5 kVA']) },
    {
      name: 'Gerador 5 kVA',
      department: 'hardware',
      value: '0',
      quantity: '1',
      status: 'Guardado',
      patrimonio: '',
      responsavel: '',
      term: '',
      image: '',
      project: '',
      count: 1,
      sql: false,
      write: false,
      file: '',
    },
  );

  assert.equal(parseArgs(['--count', '4']).count, 4);

  const fileMode = parseArgs(['--file', 'seed.txt', '--write']);
  assert.equal(fileMode.file, 'seed.txt');
  assert.equal(fileMode.write, true);

  assert.throws(() => parseArgs(['--desconhecida', 'x']), /opção desconhecida/);
  assert.throws(() => parseArgs(['--sql']), /informe --name/);
});

const SEED = `INSERT INTO equipments (id, name, department, value, quantity, status, patrimonio, responsavel, term, image, created_at, project) VALUES
('equip_1003325', 'Notebook DELL, modelo 15 (tela 15")', 'hardware', 7332.00, 1, 'Em Uso', '1003325', 'Júlia', 'uploads/terms/teste.pdf', 'uploads/images/images (2).jpg', '2025-10-11 00:00:00', 'Observatório'),
('', 'NOBREAK RAGTECH 3200VA (2 baterias, saída 115V)', 'hardware', 2100.00, 1, 'Guardado', '', '', '', '', '', 'Observatório'),
('', 'HD INTERNO 6TB, marca X', 'hardware', 1400.00, 8, 'Guardado', '', '', '', '', '', 'Observatório');
`;

test('fillIds preenche só os ids vazios e preserva o resto do arquivo', async () => {
  const { fillIds } = await loadGenerator();
  let counter = 0;
  const { sql, stats } = fillIds(SEED, () => `id${++counter}-abc12345`);

  assert.deepEqual(
    {
      rows: stats.rows,
      idsFilled: stats.idsFilled,
      idsKept: stats.idsKept,
      datesFixed: stats.datesFixed,
    },
    { rows: 3, idsFilled: 2, idsKept: 1, datesFixed: 2 },
  );
  assert.ok(sql.includes("('equip_1003325',"), 'id existente é mantido');
  assert.ok(sql.includes("('id1-abc12345', 'NOBREAK RAGTECH 3200VA (2 baterias, saída 115V)'"));
  assert.ok(sql.includes("('id2-abc12345', 'HD INTERNO 6TB, marca X'"));
  assert.ok(sql.includes("'2025-10-11 00:00:00'"), 'datas existentes ficam intactas');
});

test('fillIds troca created_at vazio por CURRENT_TIMESTAMP', async () => {
  const { fillIds } = await loadGenerator();
  const { sql, stats } = fillIds(SEED, () => 'mvsample-1a2b3c4d');

  assert.equal(stats.datesFixed, 2);
  assert.ok(
    sql.includes(
      "'mvsample-1a2b3c4d', 'HD INTERNO 6TB, marca X', 'hardware', 1400.00, 8, 'Guardado', '', '', '', '', CURRENT_TIMESTAMP, 'Observatório')",
    ),
  );
  assert.ok(stats.notes.some((note) => note.includes('CURRENT_TIMESTAMP')));
});

test('fillIds avisa quando o INSERT não tem coluna id', async () => {
  const { fillIds } = await loadGenerator();
  const input = "INSERT INTO logs (name) VALUES ('x');";
  const { sql, stats } = fillIds(input, () => 'mv-1');

  assert.equal(sql, input);
  assert.deepEqual(stats.notes, ['INSERT em logs não tem coluna id: nada alterado']);
});

test('aponta vírgula faltando entre as linhas do VALUES', async () => {
  const { parseInserts } = await loadGenerator();
  const broken = "INSERT INTO equipments (id, name) VALUES ('', 'a')\n('', 'b');";

  assert.throws(() => parseInserts(broken), /linha 2: faltou ","/);
});

test('aponta quantidade errada de valores por linha', async () => {
  const { fillIds } = await loadGenerator();

  assert.throws(
    () => fillIds("INSERT INTO equipments (id, name, department) VALUES ('', 'a');"),
    /2 valor\(es\) para 3 coluna\(s\)/,
  );
});

test('nomes com vírgula, parênteses e aspas não quebram a leitura', async () => {
  const { parseInserts } = await loadGenerator();
  const [statement] = parseInserts(
    'INSERT INTO equipments (id, name) VALUES (\'\', \'Dell XPS 13 (tela 13", RAM 32GB), to\'\'que\');',
  );

  assert.equal(statement.rows[0].length, 2);
  assert.equal(
    statement.rows[0][1].text,
    '\'Dell XPS 13 (tela 13", RAM 32GB), to\'\'que\'',
  );
});
