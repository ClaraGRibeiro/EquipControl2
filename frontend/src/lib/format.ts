export const truncateWords = (text: string, limit = 3) => {
  const words = text.trim().split(/\s+/);
  return words.length > limit ? `${words.slice(0, limit).join(" ")}...` : text;
};
export function money(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
