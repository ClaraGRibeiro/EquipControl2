import { AppFooter } from "@/components/app-footer";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { EquipmentDetailDialog } from "@/components/dialogs/equipment-detail-dialog";
import { EquipmentFormDialog } from "@/components/dialogs/equipment-form-dialog";
import { ExcelDialog } from "@/components/dialogs/excel-dialog";
import { ProjectReportDialog } from "@/components/dialogs/project-report-dialog";
import { TermFormDialog } from "@/components/dialogs/term-form-dialog";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryHeader } from "@/components/inventory/inventory-header";
import { InventoryOverview } from "@/components/inventory/inventory-overview";
import { InventoryPagination } from "@/components/inventory/inventory-pagination";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { SelectionToolbar } from "@/components/inventory/selection-toolbar";
import { UndoDeleteBanner } from "@/components/inventory/undo-delete-banner";
import { LoginScreen } from "@/components/login-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toast } from "@/components/ui/toast";
import { useInventory } from "@/hooks/use-inventory";
import { useTheme } from "@/hooks/use-theme";
import { Plus } from "lucide-react";
import { useState } from "react";

function App() {
  const store = useInventory();
  const { theme, toggleTheme } = useTheme();
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem("equipcontrol-auth") === "ok",
  );

  const dismissToast = () => {
    store.setToast("");
    store.setUndoAssets([]);
  };

  const undoToast = store.undoAssets.length
    ? () => void store.undoAssetRemoval()
    : undefined;

  if (!loggedIn)
    return (
      <>
        <LoginScreen
          notify={store.notify}
          onAuthorized={() => {
            localStorage.setItem("equipcontrol-auth", "ok");
            setLoggedIn(true);
          }}
        />
        <Toast
          message={store.toast}
          onClose={dismissToast}
          onUndo={undoToast}
        />
      </>
    );

  return (
    <div className="min-h-screen">
      <InventoryHeader
        store={store}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={() => {
          localStorage.removeItem("equipcontrol-auth");
          setLoggedIn(false);
        }}
      />

      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <InventoryOverview store={store} />

        <Card className="overflow-hidden border-slate-200/80 dark:border-slate-700/80">
          <SelectionToolbar store={store} />
          <InventoryFilters store={store} />
          <InventoryTable store={store} />
          <InventoryPagination store={store} />
        </Card>

        <div className="flex items-center justify-between rounded-xl border border-dashed bg-white/60 px-4 py-3 text-xs text-muted-foreground dark:bg-slate-900/60">
          <span>EquipControl — Inventário de equipamentos</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> API REST ·
            MariaDB
          </span>
        </div>

        <Button onClick={store.openNew} className="fixed bottom-6 left-6">
          <Plus className="h-4 w-4" />
        </Button>
      </main>

      <AppFooter />

      <UndoDeleteBanner
        visible={store.undoItems.length > 0}
        onUndo={() => void store.undoDelete()}
        onDismiss={store.discardUndoDelete}
      />

      <EquipmentFormDialog store={store} />
      <EquipmentDetailDialog store={store} />
      <DeleteConfirmDialog store={store} />
      <TermFormDialog store={store} />
      <ProjectReportDialog store={store} />
      <ExcelDialog store={store} />

      <Toast message={store.toast} onClose={dismissToast} onUndo={undoToast} />
    </div>
  );
}

export default App;
