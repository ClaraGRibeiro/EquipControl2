import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFImage } from "pdf-lib";
import { money } from "./format";
import type { Equipment } from "./types";

export type ProjectReportData = {
  selectedItems: Equipment[];
  reportProject: string;
  // Bytes do logo usado como marca d'água. Ausente ou inválido = relatório sem marca.
  logo?: Uint8Array | null;
};

export const REPORT_LOGO_URL = "/logo.png";

// Marca d'água desenhada atrás da tabela: WATERMARK_SCALE é a fração da área
// útil e WATERMARK_OPACITY controla o quanto ela aparece. Exportadas porque os
// testes comparam o valor aplicado no PDF com o valor configurado.
export const WATERMARK_SCALE = 0.7;
export const WATERMARK_OPACITY = 0.1;

let cachedLogo: Uint8Array | null = null;

// Busca o logo uma vez por sessão; falha de download nunca impede o relatório.
export async function loadReportLogo(url = REPORT_LOGO_URL): Promise<Uint8Array | null> {
  if (cachedLogo) return cachedLogo;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`status ${response.status}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;

    cachedLogo = isPng || isJpg ? bytes : null;
  } catch {
    cachedLogo = null;
  }

  return cachedLogo;
}

// Monta o PDF do inventário (apenas pdf-lib, sem depender do navegador).
export async function buildProjectReportPdf({
  selectedItems,
  reportProject,
  logo,
}: ProjectReportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let watermark: PDFImage | null = null;

  if (logo && logo.length) {
    try {
      const isJpg = logo[0] === 0xff && logo[1] === 0xd8;
      watermark = isJpg ? await pdf.embedJpg(logo) : await pdf.embedPng(logo);
    } catch {
      watermark = null;
    }
  }

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 28;
  const tableWidth = pageWidth - margin * 2;
  const headerHeight = 70;
  const rowHeight = 27;
  const bottomLimit = 42;

  const projectTitle =
    reportProject === "__todos__" ? "Todos os projetos" : reportProject;

  // Com um projeto escolhido, o cabeçalho já diz qual é: a coluna seria repetição.
  const showProjectColumn = reportProject === "__todos__";

  // `value` recebe a linha já numerada (1, 2, 3...), então o cabeçalho e as células
  // saem sempre na mesma ordem, sem vetor paralelo para manter em sincronia.
  type ReportColumn = {
    title: string;
    width: number;
    value: (item: Equipment, row: number) => string;
  };

  const columns: ReportColumn[] = [
    // Numerar as linhas permite perceber se alguém tirou uma página do PDF: a
    // sequência quebra no meio. Largura generosa o bastante para "100" sem corte.
    { title: "#", width: 40, value: (_item, row) => String(row) },
    {
      title: "Equipamento",
      width: 165,
      value: (item) => item.name || "Sem descrição",
    },
    {
      title: "Patrimônio",
      width: 82,
      value: (item) => String(item.patrimonio || "").trim() || "—",
    },
    {
      title: "Responsável",
      width: 105,
      value: (item) => item.responsavel || "Não atribuído",
    },
    ...(showProjectColumn
      ? [
          {
            title: "Projeto / fonte",
            width: 155,
            value: (item: Equipment) => (item.project || "").trim() || "Sem projeto",
          },
        ]
      : []),
    {
      title: "Valor unit.",
      width: 78,
      value: (item) => money(Number(item.value) || 0),
    },
    {
      title: "Qtd.",
      width: 38,
      value: (item) => String(Math.max(1, Number(item.quantity) || 1)),
    },
    {
      title: "Status",
      width: 92,
      value: (item) => item.status || "—",
    },
  ];

  const originalWidth = columns.reduce(
    (sum, column) => sum + column.width,
    0,
  );

  columns.forEach((column) => {
    column.width = (column.width / originalWidth) * tableWidth;
  });

  const sortedItems = [...selectedItems].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    }),
  );

  const colors = {
    primary: rgb(0.04, 0.35, 0.34),
    text: rgb(0.12, 0.17, 0.24),
    muted: rgb(0.4, 0.45, 0.51),
    border: rgb(0.87, 0.89, 0.91),
    alternate: rgb(0.95, 0.97, 0.98),
    white: rgb(1, 1, 1),
    header: rgb(0.91, 0.94, 0.95),
  };

  let pagePdf = pdf.addPage([pageWidth, pageHeight]);
  let y = 0;
  let rowNumber = 0;
  // Contagem corrida de linhas do relatório (a coluna #): não zera na virada de
  // página, é o que permite notar uma página arrancada do PDF.
  let rowSequence = 0;

  const drawCellText = (
    value: string,
    x: number,
    baseline: number,
    maxWidth: number,
    size = 7.5,
    isBold = false,
  ) => {
    const selectedFont = isBold ? bold : font;
    const originalText = String(value || "—");
    let output = originalText;

    while (
      output.length > 1 &&
      selectedFont.widthOfTextAtSize(output, size) > maxWidth
    ) {
      output = output.slice(0, -1);
    }

    if (output !== originalText && output.length > 3) {
      output = `${output.slice(0, -3)}...`;
    }

    pagePdf.drawText(output, {
      x,
      y: baseline,
      size,
      font: selectedFont,
      color: colors.text,
    });
  };

  // Logo centralizado atrás de tudo: por isso é desenhado antes do cabeçalho e
  // das linhas da tabela.
  const drawWatermark = () => {
    if (!watermark) return;

    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - 40;
    const scale =
      Math.min(maxW / watermark.width, maxH / watermark.height) * WATERMARK_SCALE;
    const width = watermark.width * scale;
    const height = watermark.height * scale;

    pagePdf.drawImage(watermark, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
      opacity: WATERMARK_OPACITY,
    });
  };

  // Cada chamada abre uma página nova (menos a primeira, que já existe): sem
  // isso o cabeçalho e as linhas voltam para o topo e são desenhados por cima
  // do que já estava na página.
  const drawPageHeader = (firstPage = false) => {
    if (!firstPage) {
      pagePdf = pdf.addPage([pageWidth, pageHeight]);
    }

    drawWatermark();

    pagePdf.drawRectangle({
      x: 0,
      y: pageHeight - headerHeight,
      width: pageWidth,
      height: headerHeight,
      color: colors.primary,
    });

    pagePdf.drawText("EQUIPCONTROL", {
      x: margin,
      y: pageHeight - 25,
      size: 16,
      font: bold,
      color: colors.white,
    });

    pagePdf.drawText("Inventário de equipamentos", {
      x: margin,
      y: pageHeight - 42,
      size: 9,
      font,
      color: colors.white,
    });

    const title =
      projectTitle.length > 90
        ? `${projectTitle.slice(0, 87)}...`
        : projectTitle;

    pagePdf.drawText(`Projeto: ${title}`, {
      x: margin,
      y: pageHeight - 59,
      size: 8,
      font,
      color: colors.white,
    });

    const dateText = `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;

    pagePdf.drawText(dateText, {
      x: pageWidth - margin - font.widthOfTextAtSize(dateText, 9),
      y: pageHeight - 27,
      size: 9,
      font,
      color: colors.white,
    });

    y = pageHeight - headerHeight - 24;

    const tableHeaderHeight = 25;

    pagePdf.drawRectangle({
      x: margin,
      y: y - tableHeaderHeight + 5,
      width: tableWidth,
      height: tableHeaderHeight,
      color: colors.header,
    });

    let x = margin;

    for (const column of columns) {
      drawCellText(
        column.title,
        x + 6,
        y - 10,
        column.width - 12,
        7.5,
        true,
      );

      x += column.width;
    }

    y -= tableHeaderHeight;
  };

  let grandTotal = 0;
  let totalQuantity = 0;

  drawPageHeader(true);

  for (const item of sortedItems) {
    if (y - rowHeight < bottomLimit) {
      drawPageHeader();
      rowNumber = 0;
    }

    rowSequence++;

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitValue = Number(item.value) || 0;

    grandTotal += unitValue * quantity;
    totalQuantity += quantity;

    if (rowNumber % 2 === 1) {
      pagePdf.drawRectangle({
        x: margin,
        y: y - rowHeight + 5,
        width: tableWidth,
        height: rowHeight,
        color: colors.alternate,
      });
    }

    pagePdf.drawLine({
      start: { x: margin, y: y - rowHeight + 5 },
      end: { x: margin + tableWidth, y: y - rowHeight + 5 },
      thickness: 0.5,
      color: colors.border,
    });

    const values = columns.map((column) => column.value(item, rowSequence));
    let x = margin;

    values.forEach((value, index) => {
      const column = columns[index];

      drawCellText(value, x + 6, y - 12, column.width - 12, 7.5);

      x += column.width;
    });

    y -= rowHeight;
    rowNumber++;
  }

  // Mantém o resumo na mesma página, quando houver espaço.
  if (y - 55 < bottomLimit) {
    drawPageHeader();
  }

  y -= 8;

  pagePdf.drawLine({
    start: { x: margin, y },
    end: { x: margin + tableWidth, y },
    thickness: 1,
    color: colors.primary,
  });

  y -= 20;

  const summaryText =
    `Registros: ${sortedItems.length}   |   ` +
    `Unidades: ${totalQuantity}`;

  pagePdf.drawText(summaryText, {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: colors.text,
  });

  const totalText = `Total investido: ${money(grandTotal)}`;

  pagePdf.drawText(totalText, {
    x: pageWidth - margin - bold.widthOfTextAtSize(totalText, 11),
    y,
    size: 11,
    font: bold,
    color: colors.primary,
  });

  // Rodapé carimbado no fim, quando o total de páginas já é conhecido:
  // "Página X de Y" junto da coluna # deixa visível se alguém tirar uma página
  // do PDF (a numeração de páginas e a de linhas deixam de fechar).
  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    const label = `Página ${index + 1} de ${pages.length}`;

    pdfPage.drawText(label, {
      x: pageWidth - margin - font.widthOfTextAtSize(label, 8),
      y: 18,
      size: 8,
      font,
      color: colors.muted,
    });
  });

  return pdf.save();
}

// Nome do arquivo do relatório, no formato usado pelo download.
export function projectReportFileName({ reportProject }: ProjectReportData) {
  const projectTitle =
    reportProject === "__todos__" ? "Todos os projetos" : reportProject;

  const date = new Date().toISOString().slice(0, 10);
  const safeProject = projectTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return reportProject === "__todos__"
    ? `inventario-todos-os-projetos-${date}.pdf`
    : `inventario-${safeProject || "projeto"}-${date}.pdf`;
}

export async function generateProjectReportPdf(data: ProjectReportData) {
  // Sem logo explícito, usa o mesmo /logo.png que serve o ícone do site.
  const logo = data.logo === undefined ? await loadReportLogo() : data.logo;
  const bytes = await buildProjectReportPdf({ ...data, logo });

  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = projectReportFileName(data);

  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
