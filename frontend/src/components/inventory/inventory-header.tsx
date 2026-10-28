import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDownToLine,
  FileText,
  LogOut,
  Menu,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { InventoryController } from "@/hooks/use-inventory";
import type { Theme } from "@/lib/theme";

export function InventoryHeader({
  store,
  onLogout,
  theme,
  onToggleTheme,
}: {
  store: InventoryController;
  onLogout: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { notify, items, load, openNew, exportProjectReport, exportExcel } =
    store;

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur dark:bg-slate-900/90">
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
          <Button
            variant="outline"
            onClick={exportProjectReport}
            title="Gerar relatório PDF"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={exportExcel}
            title="Exportar dados para Excel"
          >
            <ArrowDownToLine className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void load();
              notify("Atualizando inventário...");
            }}
            title="Atualizar inventário"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <Button
            variant="destructive"
            onClick={onLogout}
            className="text-white"
            title="Sair da conta"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <Button onClick={openNew} title="Novo equipamento">
            <Plus className="h-4 w-4" />
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
        <div className="border-t bg-white px-4 py-3 shadow-lg md:hidden dark:bg-slate-900">
          <div className="mx-auto grid max-w-[1440px] gap-2">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
            <ThemeToggle
              theme={theme}
              onToggle={onToggleTheme}
              withLabel
              className="w-full justify-start"
            />
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair da conta
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
