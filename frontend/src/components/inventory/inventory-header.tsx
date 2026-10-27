import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDownToLine,
  FileText,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import type { InventoryController } from "@/hooks/use-inventory";

export function InventoryHeader({
  store,
  onLogout,
}: {
  store: InventoryController;
  onLogout: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const {
    notify,
    items,
    load,
    openNew,
    exportProjectReport,
    exportExcel,
  } = store;

  return (

    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Equip<span className="text-primary">Control</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestão de patrimônio e equipamentos
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" size="sm" onClick={exportProjectReport}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportExcel}>
            <ArrowDownToLine className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void load();
              notify("Atualizando inventário...");
            }}
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button
            variant="destructive"
            onClick={onLogout}
            className="text-white"
          >
            <X className="h-4 w-4" />
            Sair
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Novo equipamento
          </Button>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 md:hidden"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>
      {mobileMenuOpen && (
        <div className="border-t bg-white px-4 py-3 shadow-lg md:hidden">
          <div className="mx-auto grid max-w-[1440px] gap-2">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Menu de ações
            </p>
            <Button
              className="w-full justify-start"
              onClick={() => {
                setMobileMenuOpen(false);
                openNew();
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo equipamento
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setMobileMenuOpen(false);
                exportProjectReport();
              }}
            >
              <FileText className="mr-2 h-4 w-4" /> Gerar relatório PDF
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setMobileMenuOpen(false);
                exportExcel();
              }}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Exportar dados para
              Excel
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setMobileMenuOpen(false);
                void load();
                notify("Atualizando inventário...");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar inventário
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
            >
              <X className="mr-2 h-4 w-4" /> Sair da conta
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
