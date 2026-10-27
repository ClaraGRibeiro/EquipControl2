import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readDataUrl } from "./files";
import { money } from "./format";
import type { Equipment, TermValues } from "./types";

// Preenche o template.pdf da pasta público e devolve o termo em data URL.
export async function generateTermDocument({
  item,
  termValues,
}: {
  item: Equipment;
  termValues: TermValues;
}) {

  const templateResponse = await fetch("/template.pdf");
  if (!templateResponse.ok)
    throw new Error("Não foi possível carregar template.pdf.");
  const pdf = await PDFDocument.load(await templateResponse.arrayBuffer());
  const page = pdf.getPages()[0];
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({
    x: 48,
    y: 45,
    width: width - 96,
    height: height - 100,
    color: rgb(1, 1, 1),
  });
  const lines = [
    ["TERMO DE RESPONSABILIDADE DE USO E GUARDA DE EQUIPAMENTO", ""],
    ["Nome do Projeto: ", termValues.projectName],
    ["Edital nº: ", termValues.edital],
    ["Processo: ", termValues.processo],
    ["Número do Pedido: ", termValues.pedido],
    ["Processo de compra: ", termValues.compra],
    ["Nota Fiscal nº: ", termValues.nota],
    ["Data da Aquisição: ", termValues.aquisicao],
    ["Valor do Equipamento: ", money(item.value)],
    ["Situação do Equipamento: ", termValues.situacao],
    ["Número do Patrimônio: ", item.patrimonio || "Não informado"],
    ["Dados do Equipamento: ", item.name],
    ["Responsável: ", termValues.responsavel],
    ["Matrícula/CPF: ", termValues.cpf],
    ["Data do recebimento: ", termValues.recebimento],
    ["", ""],
    [
      "Declaro que recebi o equipamento descrito acima e me responsabilizo por sua guarda, uso adequado, manutenção, conservação e devolução quando solicitado.",
    ],
    [
      "Comprometo-me a utilizar o equipamento exclusivamente para fins institucionais, zelar por sua integridade e comunicar imediatamente qualquer dano, perda ou irregularidade.",
    ],
    ["", ""],
    [
      "Assinatura do responsável: ______________________________________________",
    ],
    [
      "Assinatura do responsável pelo patrimônio: _______________________________",
    ],
  ];
  let y = height - 72;
  for (let idx = 0; idx < lines.length; idx++) {
    const [label, value] = lines[idx];
    if (idx === 0) {
      const text = label;
      page.drawText(text, {
        x: Math.max(42, (width - bold.widthOfTextAtSize(text, 12)) / 2),
        y,
        size: 12,
        font: bold,
        color: rgb(0.08, 0.08, 0.08),
      });
      y -= 30;
      continue;
    }
    const text = `${label}${value}`;
    if (text.trim()) {
      const size = idx > 15 ? 9 : 10;
      const words = text.split(/\s+/);
      let line = "",
        lineNo = 0;
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > width - 100 && line) {
          page.drawText(line, {
            x: 52,
            y,
            size,
            font: idx < 15 ? font : font,
            color: rgb(0.08, 0.08, 0.08),
          });
          y -= 13;
          line = word;
          lineNo++;
        } else line = candidate;
      }
      if (line)
        page.drawText(line, {
          x: 52,
          y,
          size,
          font: idx === 0 ? bold : font,
          color: rgb(0.08, 0.08, 0.08),
        });
      y -= idx > 15 ? 18 : 16;
    } else y -= 8;
    if (y < 40) {
      const next = pdf.addPage();
      y = next.getHeight() - 50;
    }
  }
  const bytes = await pdf.save();
  const fileBytes = new Uint8Array(bytes.length);
  fileBytes.set(bytes);
  const file = new File([fileBytes.buffer], `termo-${item.id}.pdf`, {
    type: "application/pdf",
  });
  const data = await readDataUrl(file);
  return data;
}
