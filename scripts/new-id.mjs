#!/usr/bin/env node
// Gera ids de equipamento no mesmo formato do cadastro em tela
// (frontend/src/lib/id.ts) para quem insere registros direto no MySQL.
//
//   npm run new-id -- --name "..."                     -> id + INSERT pronto
//   npm run new-id -- --count 3                        -> três ids
//   npm run new-id -- --file seed.txt                  -> SQL com os ids vazios preenchidos
//   npm run new-id -- --file seed.txt --write          -> aplica a mudança no arquivo
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

// Mantenha igual a frontend/src/lib/id.ts; tests/equipment-id.test.js compara os dois.
export const newEquipmentId = () =>
  `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

// Ordem das colunas do INSERT (created_at fica para o DEFAULT CURRENT_TIMESTAMP).
const COLUMNS = [
  "name",
  "department",
  "value",
  "quantity",
  "status",
  "patrimonio",
  "responsavel",
  "term",
  "image",
  "project",
];

const DEFAULTS = {
  name: "",
  department: "hardware",
  value: "0",
  quantity: "1",
  status: "Guardado",
  patrimonio: "",
  responsavel: "",
  term: "",
  image: "",
  project: "",
};

const FLAGS = { "--sql": "sql", "--write": "write", "--file": "file", "--count": "count" };

export function parseArgs(argv) {
  const options = { ...DEFAULTS, count: 1, sql: false, write: false, file: "" };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg in FLAGS) {
      const key = FLAGS[arg];
      if (key === "count") options.count = Math.max(1, Number(argv[++index]) || 1);
      else if (key === "file") options.file = argv[++index] ?? "";
      else options[key] = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      if (!options.name) options.name = arg;
      continue;
    }

    const key = arg.slice(2);
    if (!(key in DEFAULTS)) throw new Error(`opção desconhecida: ${arg}`);
    options[key] = argv[++index] ?? "";
  }

  if (!options.file && !options.write && options.sql && !options.name.trim()) {
    throw new Error('informe --name "descrição do equipamento"');
  }

  return options;
}

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

// value e quantity saem sem aspas para bater com o schema (DECIMAL/INT).
const NUMERIC_COLUMNS = new Set(["value", "quantity"]);

const literal = (column, value) => {
  const raw = String(value).trim();
  if (NUMERIC_COLUMNS.has(column) && raw !== "" && Number.isFinite(Number(raw))) return raw;
  return quote(raw);
};

export function buildInsert(id, values) {
  const columns = ["id", ...COLUMNS];
  const row = [quote(id), ...COLUMNS.map((column) => literal(column, values[column]))];
  return `INSERT INTO equipments (${columns.join(", ")})\nVALUES (${row.join(", ")});`;
}

// ---------------------------------------------------------------------------
// Modo arquivo: preenche os ids vazios de um .sql de seed sem mexer no resto.
// ---------------------------------------------------------------------------

const lineAt = (sql, index) => sql.slice(0, index).split("\n").length;

function skipTrivia(sql, index) {
  let i = index;

  while (i < sql.length) {
    const char = sql[i];

    if (/\s/.test(char)) i++;
    else if (char === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
    } else if (char === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      if (end === -1) return sql.length;
      i = end + 2;
    } else break;
  }

  return i;
}

// Fim de um literal entre aspas, respeitando '' (aspas duplicadas) e \'.
function readQuoted(sql, index) {
  const quoteChar = sql[index];
  let i = index + 1;

  while (i < sql.length) {
    if (sql[i] === "\\" && quoteChar !== "`") i += 2;
    else if (sql[i] === quoteChar) {
      if (sql[i + 1] === quoteChar) i += 2;
      else return i + 1;
    } else i++;
  }

  throw new Error(`linha ${lineAt(sql, index)}: aspas não fechadas`);
}

function readWord(sql, index, what) {
  if (sql[index] === "`" || sql[index] === '"') {
    const end = readQuoted(sql, index);
    return { text: sql.slice(index, end), start: index, end };
  }

  const match = /^[A-Za-z0-9_$]+/.exec(sql.slice(index));
  if (!match) throw new Error(`linha ${lineAt(sql, index)}: esperava ${what}`);
  return { text: match[0], start: index, end: index + match[0].length };
}

// Um valor até a próxima vírgula/parêntese que esteja fora de strings e parênteses,
// porque as descrições dos equipamentos têm vírgulas e parênteses dentro do texto.
function readValue(sql, index) {
  let i = index;
  let depth = 0;

  while (i < sql.length) {
    const char = sql[i];

    if (char === "'" || char === '"' || char === "`") i = readQuoted(sql, i);
    else if (char === "(") {
      depth++;
      i++;
    } else if (char === ")") {
      if (depth === 0) break;
      depth--;
      i++;
    } else if (char === "," && depth === 0) break;
    else i++;
  }

  return { text: sql.slice(index, i).trim(), start: index, end: i };
}

function parseInsert(sql, start) {
  let i = skipTrivia(sql, start + "insert".length);

  const into = readWord(sql, i, "INTO");
  if (into.text.toLowerCase() !== "into")
    throw new Error(`linha ${lineAt(sql, into.start)}: esperava INTO`);

  i = skipTrivia(sql, into.end);
  let table = readWord(sql, i, "nome da tabela");
  i = skipTrivia(sql, table.end);
  if (sql[i] === ".") {
    i = skipTrivia(sql, i + 1);
    table = readWord(sql, i, "nome da tabela");
  }

  const columns = [];
  i = skipTrivia(sql, table.end);
  if (sql[i] === "(") {
    i++;
    for (;;) {
      i = skipTrivia(sql, i);
      if (sql[i] === ")") {
        i++;
        break;
      }

      const column = readWord(sql, i, "nome de coluna");
      columns.push(column);

      i = skipTrivia(sql, column.end);
      if (sql[i] === ",") i++;
      else if (sql[i] === ")") {
        i++;
        break;
      } else
        throw new Error(
          `linha ${lineAt(sql, i)}: esperava "," ou ")" na lista de colunas`,
        );
    }
  }

  i = skipTrivia(sql, i);
  const valuesWord = readWord(sql, i, "VALUES");
  if (valuesWord.text.toLowerCase() !== "values")
    throw new Error(`linha ${lineAt(sql, valuesWord.start)}: esperava VALUES`);

  const rows = [];
  i = valuesWord.end;
  for (;;) {
    i = skipTrivia(sql, i);
    if (sql[i] !== "(")
      throw new Error(`linha ${lineAt(sql, i)}: esperava um bloco VALUES (...)`);

    i++;
    const values = [];
    for (;;) {
      i = skipTrivia(sql, i);
      const value = readValue(sql, i);
      values.push(value);

      i = skipTrivia(sql, value.end);
      if (sql[i] === ",") i++;
      else if (sql[i] === ")") {
        i++;
        break;
      } else
        throw new Error(
          `linha ${lineAt(sql, i)}: esperava "," ou ")" dentro do VALUES (...)`,
        );
    }
    rows.push(values);

    i = skipTrivia(sql, i);
    if (sql[i] === ",") i++;
    else if (i >= sql.length || sql[i] === ";") {
      if (sql[i] === ";") i++;
      break;
    } else
      throw new Error(
        `linha ${lineAt(sql, i)}: faltou "," depois do VALUES (...) anterior`,
      );
  }

  return { table: sql.slice(table.start, table.end), columns, rows, end: i };
}

export function parseInserts(sql) {
  const statements = [];
  let i = 0;

  while (i < sql.length) {
    i = skipTrivia(sql, i);
    if (i >= sql.length) break;

    if (!/^insert\b/i.test(sql.slice(i)))
      throw new Error(`linha ${lineAt(sql, i)}: só INSERTs são suportados`);

    const statement = parseInsert(sql, i);
    statements.push(statement);
    i = statement.end;
  }

  return statements;
}

const isEmptyId = (text) => text === "''" || text.toLowerCase() === "null";

// Troca somente os ids vazios (e os created_at vazios) preservando o resto do arquivo.
export function fillIds(sql, generate = newEquipmentId) {
  const stats = { rows: 0, idsFilled: 0, idsKept: 0, datesFixed: 0, notes: [] };
  const edits = [];

  for (const statement of parseInserts(sql)) {
    const names = statement.columns.map((column) =>
      column.text.replace(/[`"']/g, "").toLowerCase(),
    );
    const idIndex = names.indexOf("id");
    const createdIndex = names.indexOf("created_at");

    if (idIndex === -1) {
      stats.notes.push(`INSERT em ${statement.table} não tem coluna id: nada alterado`);
      continue;
    }

    for (const values of statement.rows) {
      if (values.length !== names.length)
        throw new Error(
          `linha ${lineAt(sql, values[0].start)}: ${values.length} valor(es) para ` +
            `${names.length} coluna(s)`,
        );

      stats.rows++;

      const idValue = values[idIndex];
      if (isEmptyId(idValue.text)) {
        edits.push({ start: idValue.start, end: idValue.end, text: `'${generate()}'` });
        stats.idsFilled++;
      } else stats.idsKept++;

      const createdValue = createdIndex >= 0 ? values[createdIndex] : null;
      if (createdValue && createdValue.text === "''") {
        edits.push({
          start: createdValue.start,
          end: createdValue.end,
          text: "CURRENT_TIMESTAMP",
        });
        stats.datesFixed++;
      }
    }
  }

  let output = sql;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);

  if (stats.datesFixed)
    stats.notes.push(
      `${stats.datesFixed} created_at vazios viraram CURRENT_TIMESTAMP ('' é recusado pelo MySQL/MariaDB)`,
    );

  return { sql: output, stats };
}

const invokedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  try {
    const { count, sql, file, write, ...values } = parseArgs(process.argv.slice(2));

    if (file) {
      const source = fs.readFileSync(file, "utf8");
      const result = fillIds(source);

      if (write) fs.writeFileSync(file, result.sql, "utf8");
      else console.log(result.sql);

      console.error(
        `${result.stats.rows} linha(s): ${result.stats.idsFilled} id(s) gerado(s), ` +
          `${result.stats.idsKept} id(s) mantido(s)` +
          (write ? ", arquivo atualizado" : " (dry-run, use --write para aplicar)"),
      );
      for (const note of result.stats.notes) console.error(`aviso: ${note}`);
    } else if (sql) {
      console.log(buildInsert(newEquipmentId(), values));
    } else {
      for (let index = 0; index < count; index++) console.log(newEquipmentId());
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
