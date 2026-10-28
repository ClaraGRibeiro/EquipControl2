export const truncateWords = (text: string, limit = 3) => {
  const words = text.trim().split(/\s+/);
  return words.length > limit ? `${words.slice(0, limit).join(" ")}...` : text;
};
// Nome de responsável longo não cabe na coluna da tabela: fica o primeiro e o
// último pedaço ("Guilherme Rocha Zuba Parrela" vira "Guilherme Parrela"). O
// completo continua no title da célula, no formulário e no detalhe do registro.
export function shortName(value: unknown) {
  const words = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= 2) return words.join(" ");

  return `${words[0]} ${words[words.length - 1]}`;
}
// Nome de arquivo longo estoura o formulário: corta no meio mantendo o começo
// e o final, onde ficam a identificação e a extensão.
export function shortFileName(name: string, limit = 44) {
  const value = String(name || "").trim();
  if (value.length <= limit) return value;

  const head = Math.round((limit - 3) * 0.7);
  const tail = limit - 3 - head;

  return `${value.slice(0, head)}...${value.slice(value.length - tail)}`;
}
export function money(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
// Data legível para o detalhe do registro. Aceita o texto do MySQL, o ISO com Z
// que a API devolve ou um Date; valor imprestável volta como veio, sem "Invalid Date".
export function dateTime(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
// Último pedaço do caminho salvo em term/image, para mostrar o nome do arquivo
// sem a barra inteira de /uploads/ na frente.
export function fileName(path?: string) {
  const value = String(path || "").trim();
  if (!value) return "";
  const last = value.split(/[\\/]/).filter(Boolean).pop() || value;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
