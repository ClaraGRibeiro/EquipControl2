const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const esbuild = require("esbuild");
const { PDFDocument } = require("pdf-lib");

const repo = path.join(__dirname, "..");

// O relatório roda no navegador, então para testar em Node transformamos o
// módulo TS em CJS com o esbuild que já vem do Vite.
function loadReportModule() {
  const outfile = path.join(
    repo,
    "node_modules",
    ".cache",
    "equip-control-tests",
    "project-report.cjs",
  );

  esbuild.buildSync({
    entryPoints: [path.join(repo, "frontend", "src", "lib", "project-report.ts")],
    outfile,
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    logLevel: "silent",
  });

  return require(outfile);
}

function equipment(index) {
  return {
    id: `item-${index}`,
    name: `Equipamento ${String(index).padStart(3, "0")}`,
    department: "hardware",
    responsavel: `Responsavel ${index}`,
    project: "Projeto Alpha",
    value: 1000 + index,
    quantity: 2,
    status: "Guardado",
    termo: "",
    imagem: "",
    created_at: null,
  };
}

// Devolve o texto desenhado em cada página (pdf-lib grava os textos em hex).
async function pagesOf(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const flat = await pdf.save({ useObjectStreams: false });
  const raw = Buffer.from(flat).toString("latin1");

  const hexToText = (hex) => {
    let out = "";
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return out;
  };

  const readText = (stream) =>
    [...stream.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)].map((m) => hexToText(m[1])).join("\n");

  const streams = new Map();
  const objRegex = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
  let match;

  while ((match = objRegex.exec(raw))) {
    const body = match[2];
    const start = body.indexOf("stream");
    if (start === -1) continue;

    const dict = body.slice(0, start);
    if (!/FlateDecode/.test(dict)) continue;

    const dataStart = body.indexOf("\n", start) + 1;
    const dataEnd = body.lastIndexOf("endstream");
    const inflated = zlib
      .inflateSync(Buffer.from(body.slice(dataStart, dataEnd), "latin1"))
      .toString("latin1");
    streams.set(match[1], readText(inflated));
  }

  const pages = [];
  const pageRegex = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;

  while ((match = pageRegex.exec(raw))) {
    if (!/\/Type\s*\/Page(?![s])/.test(match[2])) continue;
    const contents = /\/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)/.exec(match[2]);
    if (!contents) continue;
    const text = [...contents[1].matchAll(/(\d+)\s+0\s+R/g)]
      .map((ref) => streams.get(ref[1]) || "")
      .join("\n");
    pages.push(text);
  }

  return pages;
}

const count = (text, needle) => text.split(needle).length - 1;

test("relatório cabe em uma página quando há poucos registros", async () => {
  const { buildProjectReportPdf } = loadReportModule();

  const pages = await pagesOf(
    await buildProjectReportPdf({
      selectedItems: Array.from({ length: 5 }, (_, i) => equipment(i)),
      reportProject: "__todos__",
    }),
  );

  assert.strictEqual(pages.length, 1);
  assert.strictEqual(count(pages[0], "EQUIPCONTROL"), 1);
  assert.strictEqual(count(pages[0], "Registros: 5"), 1);
  assert.strictEqual(count(pages[0], "Total investido"), 1);
  assert.strictEqual(count(pages[0], "hardware"), 5);
});

test("relatório grande abre novas páginas em vez de desenhar por cima", async () => {
  const { buildProjectReportPdf } = loadReportModule();

  const total = 40;
  const pages = await pagesOf(
    await buildProjectReportPdf({
      selectedItems: Array.from({ length: total }, (_, i) => equipment(i)),
      reportProject: "__todos__",
    }),
  );

  assert.ok(pages.length > 1, `esperava mais de uma página, veio ${pages.length}`);

  let seen = 0;

  pages.forEach((page, index) => {
    // Cada página tem o próprio cabeçalho e o próprio rodapé, uma única vez.
    assert.strictEqual(count(page, "EQUIPCONTROL"), 1, `cabeçalho duplicado na página ${index + 1}`);
    assert.strictEqual(count(page, `Página ${index + 1}`), 1, `rodapé errado na página ${index + 1}`);

    const rows = count(page, "\nhardware\n");
    assert.ok(rows > 0 && rows <= 16, `página ${index + 1} com ${rows} linhas`);
    seen += rows;
  });

  assert.strictEqual(seen, total, "linhas perdidas ou repetidas entre as páginas");

  // O resumo aparece uma única vez, na última página.
  const summaries = pages.reduce((sum, page) => sum + count(page, "Total investido"), 0);
  assert.strictEqual(summaries, 1);
  assert.strictEqual(count(pages.at(-1), "Total investido"), 1);
  assert.ok(count(pages.at(-1), `Registros: ${total}`) === 1);
});

test("nome do arquivo do relatório", async () => {
  const { projectReportFileName } = loadReportModule();

  assert.match(
    projectReportFileName({ selectedItems: [], reportProject: "__todos__" }),
    /^inventario-todos-os-projetos-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  assert.match(
    projectReportFileName({ selectedItems: [], reportProject: "Observatório Do Transportes" }),
    /^inventario-Observatorio-Do-Transportes-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});
