import { useState } from "react";
import { useEquipmentCrud } from "./use-equipment-crud";
import { useEquipmentDetail } from "./use-equipment-detail";
import { useEquipmentForm } from "./use-equipment-form";
import { useEquipmentTerm } from "./use-equipment-term";
import { useExportTools } from "./use-export-tools";
import { useInventoryView } from "./use-inventory-view";
import { useSelection } from "./use-selection";
import { useToast } from "./use-toast";

// Controlador da tela: junta dados, filtros, detalhe, formulário, termo e exportações.
export function useInventory() {
  const ui = useToast();
  const selection = useSelection();
  const crud = useEquipmentCrud({
    notify: ui.notify,
    setToast: ui.setToast,
    selected: selection.selected,
    setSelected: selection.setSelected,
    setDeleteOpen: selection.setDeleteOpen,
    bulkStatus: selection.bulkStatus,
  });
  // Mesmo sinal de ocupação compartilhado entre o termo e o PDF do inventário.
  const [generating, setGenerating] = useState(false);
  const view = useInventoryView(crud.items, selection.expandedGroups);
  const detail = useEquipmentDetail({ items: crud.items });
  const form = useEquipmentForm({
    items: crud.items,
    load: crud.load,
    setSaving: crud.setSaving,
    setUndoAssets: crud.setUndoAssets,
    notify: ui.notify,
  });
  const term = useEquipmentTerm({
    load: crud.load,
    notify: ui.notify,
    generating,
    setGenerating,
  });
  const exports = useExportTools({
    items: crud.items,
    notify: ui.notify,
    generating,
    setGenerating,
  });

  const allFilteredSelected =
    view.filtered.length > 0 &&
    view.filtered.every((i) => selection.selected.includes(i.id));

  return {
    ...ui,
    ...selection,
    ...crud,
    ...view,
    ...detail,
    ...form,
    ...term,
    ...exports,
    generating,
    setGenerating,
    allFilteredSelected,
  };
}

export type InventoryController = ReturnType<typeof useInventory>;
