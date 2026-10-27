import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { statuses } from "@/lib/constants";
import type { InventoryController } from "@/hooks/use-inventory";

export function SelectionToolbar({ store }: { store: InventoryController }) {
  const { selected, setDeleteOpen, bulkStatus, setBulkStatus, applyBulkStatus, filtered } =
    store;

  return (

        <CardHeader className="gap-4 border-b bg-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Equipamentos cadastrados
            </CardTitle>
            <CardDescription className="mt-1">
              {filtered.length} registro(s) encontrado(s)
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selected.length} selecionado(s)
                </span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void applyBulkStatus()}
                >
                  Aplicar status
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="text-white"
                >
                  <Trash2 className="h-4 w-4" /> Excluir ({selected.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
  );
}
