import type { Equipment } from "./types";

export type InventoryFilters = {
  query: string;
  department: string;
  status: string;
  project: string;
};

// Mesma regra de busca e ordenação usada pela tela de inventário.
export function filterItems(
  items: Equipment[],
  { query, department, status, project }: InventoryFilters,
) {
  return items
    .filter((i) => {
      const q = query.toLocaleLowerCase("pt-BR").trim();

      return (
        (!q ||
          i.name.toLocaleLowerCase("pt-BR").includes(q) ||
          (i.patrimonio || "").toLocaleLowerCase("pt-BR").includes(q) ||
          (i.responsavel || "").toLocaleLowerCase("pt-BR").includes(q) ||
          (i.project || "").toLocaleLowerCase("pt-BR").includes(q)) &&
        (department === "all" || i.department === department) &&
        (status === "all" || i.status === status) &&
        (project === "all" || (i.project?.trim() || "Sem projeto") === project)
      );
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", {
        sensitivity: "base",
        numeric: true,
      }),
    );
}

// Filtro por projeto usado nas exportações (Excel e PDF).
export function selectByProject(items: Equipment[], project: string) {
  return project === "__todos__"
    ? items
    : items.filter(
        (item) => ((item.project || "").trim() || "Sem projeto") === project,
      );
}

export function listProjects(items: Equipment[]) {
  return [
    ...new Set(items.map((item) => (item.project || "").trim() || "Sem projeto")),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
