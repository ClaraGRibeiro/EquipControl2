import { Card, CardContent } from "@/components/ui/card";
import { Archive, Package, ShieldCheck, Wrench } from "lucide-react";
import type { InventoryController } from "@/hooks/use-inventory";

export function InventoryOverview({ store }: { store: InventoryController }) {
  const { items, counts } = store;

  return (
    <>

      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">
            PAINEL DE CONTROLE
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Visão geral do inventário
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os equipamentos, responsáveis e documentos em um só
            lugar.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Banco de
          dados conectado via API
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4 grid-cols-2">
        {[
          {
            label: "Total de itens",
            value: counts.total,
            icon: Package,
            desc: "Unidades cadastradas",
            color: "bg-slate-100 text-slate-700",
          },
          {
            label: "Em uso",
            value: counts.inUse,
            icon: ShieldCheck,
            desc: "Unidades em utilização",
            color: "bg-blue-50 text-blue-700",
          },
          {
            label: "Guardados",
            value: counts.stored,
            icon: Archive,
            desc: "Unidades disponíveis",
            color: "bg-violet-100 text-violet-800",
          },
          {
            label: "Em manutenção",
            value: counts.maintenance,
            icon: Wrench,
            desc: "Unidades em reparo",
            color: "bg-amber-100 text-amber-800",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-slate-200/80">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
