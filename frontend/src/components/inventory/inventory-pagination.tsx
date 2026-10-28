import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryController } from "@/hooks/use-inventory";

export function InventoryPagination({ store }: { store: InventoryController }) {
  const {
    items,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeNumber,
    pageCount,
    filtered,
  } = store;

  return (

        <div className="flex flex-col gap-3 border-t bg-white px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span>
              Exibindo{" "}
              {filtered.length === 0 ? 0 : (page - 1) * pageSizeNumber + 1}–
              {Math.min(page * pageSizeNumber, filtered.length)} de{" "}
              {filtered.length} registros
            </span>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">Registros por página:</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-8 w-[80px] bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Anterior
            </Button>

            <span className="whitespace-nowrap">
              Página {page} de {pageCount}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              Próxima
            </Button>
          </div>
        </div>
  );
}
