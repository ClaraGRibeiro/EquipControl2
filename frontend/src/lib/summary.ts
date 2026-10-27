import type { Equipment } from "./types";

// Quantidades por status usadas nos cartões do topo da tela.
export function summarizeInventory(items: Equipment[]) {
  return {
    total: items.reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
    inUse: items
      .filter((i) => i.status === "Em Uso")
      .reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
    stored: items
      .filter((i) => i.status === "Guardado")
      .reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
    maintenance: items
      .filter((i) => i.status === "Manutenção")
      .reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
  };
}
