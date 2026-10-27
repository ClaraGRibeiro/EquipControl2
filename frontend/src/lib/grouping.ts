import type { Equipment } from "./types";

export type DisplayRow =
  | { type: "group"; key: string; name: string; items: Equipment[] }
  | { type: "item"; key: string; item: Equipment; parentKey?: string };

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

// Agrupa equipamentos de nomes iguais na página atual; o grupo só abre se estiver expandido.
export function buildDisplayRows(
  pageItems: Equipment[],
  expandedGroups: string[],
): DisplayRow[] {
  const map = new Map<string, Equipment[]>();

  for (const item of pageItems) {
    const key = normalizeName(item.name || "Sem descrição");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const rows: DisplayRow[] = [];

  for (const [key, groupItems] of [...map.entries()].sort((a, b) =>
    a[1][0].name.localeCompare(b[1][0].name, "pt-BR"),
  )) {
    if (groupItems.length > 1) {
      rows.push({
        type: "group",
        key,
        name: groupItems[0].name,
        items: groupItems,
      });
      if (expandedGroups.includes(key))
        for (const item of groupItems)
          rows.push({ type: "item", key: item.id, item, parentKey: key });
    } else
      rows.push({ type: "item", key: groupItems[0].id, item: groupItems[0] });
  }

  return rows;
}
