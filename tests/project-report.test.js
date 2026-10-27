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
    patrimonio: `PAT-${index}`,
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

// pdf-lib grava em object streams, o que esconde os objetos: salvamos sem eles.
async function flattenPdf(bytes) {
  const pdf = await PDFDocument.load(bytes);
  const flat = await pdf.save({ useObjectStreams: false });
  return Buffer.from(flat).toString("latin1");
}

// Content stream descomprimido de cada página, na ordem das páginas.
function pageStreams(raw) {
  const hexToText = (hex) => {
    let out = "";
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return out;
  };

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
    streams.set(match[1], inflated);
  }

  const pages = [];
  const pageRegex = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;

  while ((match = pageRegex.exec(raw))) {
    if (!/\/Type\s*\/Page(?![s])/.test(match[2])) continue;
    const contents = /\/Contents\s*(\[[^\]]*\]|\d+\s+0\s+R)/.exec(match[2]);
    if (!contents) continue;
    const stream = [...contents[1].matchAll(/(\d+)\s+0\s+R/g)]
      .map((ref) => streams.get(ref[1]) || "")
      .join("\n");
    pages.push({ stream, resources: match[2] });
  }

  return pages;
}

// Devolve o texto desenhado em cada página (pdf-lib grava os textos em hex).
async function pagesOf(bytes) {
  return pageStreams(await flattenPdf(bytes)).map(
    ({ stream }) =>
      [...stream.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)]
        .map((m) => {
          let out = "";
          for (let i = 0; i + 1 < m[1].length; i += 2) {
            out += String.fromCharCode(parseInt(m[1].slice(i, i + 2), 16));
          }
          return out;
        })
        .join("\n"),
  );
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

  // Coluna de patrimônio no lugar da de departamento.
  assert.strictEqual(count(pages[0], "Patrimônio"), 1);
  assert.strictEqual(count(pages[0], "Departamento"), 0);
  assert.strictEqual(count(pages[0], "\nPAT-"), 5);
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

    const rows = count(page, "\nPAT-");
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

test("logo entra como marca d'água em todas as páginas, atrás da tabela", async () => {
  const { buildProjectReportPdf } = loadReportModule();

  const logo = fs.readFileSync(path.join(repo, "frontend", "public", "logo.png"));

  const bytes = await buildProjectReportPdf({
    selectedItems: Array.from({ length: 20 }, (_, i) => equipment(i)),
    reportProject: "__todos__",
    logo,
  });

  const flat = await flattenPdf(bytes);
  const pages = pageStreams(flat);

  assert.ok(pages.length > 1, `esperava mais de uma página, veio ${pages.length}`);

  // Uma única cópia do logo no arquivo: imagem + máscara de transparência.
  assert.strictEqual(count(flat, "/Subtype /Image"), 2);

  pages.forEach(({ stream, resources }, index) => {
    const page = index + 1;
    const draws = [...stream.matchAll(/\/[\w-]+\s+Do\b/g)];
    assert.strictEqual(draws.length, 1, `página ${page} com ${draws.length} imagens desenhadas`);

    // Alfa baixo aplicado só ao logo, via ExtGState da própria página.
    assert.match(
      resources.replace(/\s+/g, " "),
      /\/ExtGState << \/[\w-]+ << \/Type \/ExtGState \/ca 0\.07 >>/,
    );

    // Desenhado antes do cabeçalho e do texto, por isso fica atrás de tudo, e o
    // ExtGState de alfa é aplicado logo antes do desenho da imagem.
    const imageOp = stream.search(/\/[\w-]+\s+Do\b/);
    assert.ok(imageOp > -1, `página ${page} sem imagem desenhada`);
    assert.match(stream.slice(0, imageOp), /\/[\w-]+\s+gs/);
    assert.ok(imageOp < stream.search(/\brg\b/), `fundo pintado antes da marca d'água na página ${page}`);
    assert.ok(imageOp < stream.indexOf("Tj"), `texto desenhado antes da marca d'água na página ${page}`);
  });
});

test("relatório continua sendo gerado quando o logo não está disponível", async () => {
  const { buildProjectReportPdf } = loadReportModule();

  const bytes = await buildProjectReportPdf({
    selectedItems: Array.from({ length: 3 }, (_, i) => equipment(i)),
    reportProject: "__todos__",
    logo: null,
  });

  const flat = await flattenPdf(bytes);
  const pages = pageStreams(flat);

  assert.strictEqual(count(flat, "/Subtype /Image"), 0);

  pages.forEach(({ stream }) => {
    assert.strictEqual([...stream.matchAll(/\/[\w-]+\s+Do\b/g)].length, 0);
  });

  // O conteúdo da tabela continua sendo desenhado normalmente.
  const [page] = await pagesOf(bytes);
  assert.strictEqual(count(page, "Registros: 3"), 1);
  assert.strictEqual(count(page, "\nPAT-"), 3);
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
