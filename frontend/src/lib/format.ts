export const truncateWords = (text: string, limit = 3) => {
  const words = text.trim().split(/\s+/);
  return words.length > limit ? `${words.slice(0, limit).join(" ")}...` : text;
};
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
