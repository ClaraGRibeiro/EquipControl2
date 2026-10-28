import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { departments, statuses } from "@/lib/constants";
import type { Equipment } from "@/lib/types";
import type { InventoryController } from "@/hooks/use-inventory";

export function InventoryFilters({ store }: { store: InventoryController }) {
  const {
    items,
    query,
    setQuery,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
  } = store;

  return (

        <div className="grid gap-3 border-b bg-slate-50/70 p-4 md:grid-cols-[minmax(220px,1fr)_200px_180px_220px] dark:bg-slate-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por equipamento, patrimônio ou responsável..."
              className="bg-white pl-9 pr-9 dark:bg-slate-900"
            />
            {query && (
              <button
                type="button"
                aria-label="Limpar pesquisa"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={departmentFilter}
            onValueChange={setDepartmentFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os departamentos</SelectItem>
              {[
                ...new Set([
                  ...departments,
                  ...items.map((i) => i.department),
                ]),
              ].map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="min-w-0">
              <SelectValue className="truncate" placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              {(() => {
                const total = (list: Equipment[]) =>
                  list.reduce(
                    (sum, i) =>
                      sum +
                      (Number(i.value) || 0) * (Number(i.quantity) || 0),
                    0,
                  );
                const fmt = (n: number) =>
                  n.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });
                const projects = [
                  ...new Set(
                    items.map(
                      (i) => (i.project || "").trim() || "Sem projeto",
                    ),
                  ),
                ].sort((a, b) => a.localeCompare(b, "pt-BR"));
                return (
                  <>
                    <SelectItem value="all">Todos os Projetos</SelectItem>
                    {projects.map((project) => (
                      <SelectItem
                        key={project}
                        value={project}
                        textValue={project}
                      >
                        <span
                          className="block max-w-[175px] truncate"
                          title={project}
                        >
                          {project}
                        </span>{" "}
                        (R${" "}
                        {fmt(
                          total(
                            items.filter(
                              (i) =>
                                ((i.project || "").trim() ||
                                  "Sem projeto") === project,
                            ),
                          ),
                        )}
                        )
                      </SelectItem>
                    ))}
                  </>
                );
              })()}
            </SelectContent>
          </Select>
        </div>
  );
}
