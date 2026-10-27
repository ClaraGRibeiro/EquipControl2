import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Equipment } from "@/lib/types";

type CrudOptions = {
  notify: (message: string) => void;
  setToast: (message: string) => void;
  selected: string[];
  setSelected: (ids: string[]) => void;
  setDeleteOpen: (open: boolean) => void;
  bulkStatus: string;
};

// Carregamento, alterações em linha e exclusão com desfazer (lixeira do servidor).
export function useEquipmentCrud({
  notify,
  setToast,
  selected,
  setSelected,
  setDeleteOpen,
  bulkStatus,
}: CrudOptions) {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [undoItems, setUndoItems] = useState<Equipment[]>([]);
  const [undoAssets, setUndoAssets] = useState<
    Array<{ item: Equipment; field: "term" | "image"; value: string }>
  >([]);
  // Lote de arquivos movido para uploads/.trash na última exclusão.
  const undoTrashIdRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<Equipment[]>("/api/equipments", {
        cache: "no-store",
      });
      setItems(data);
      setSelected([]);
    } catch (e) {
      notify(`Erro ao carregar equipamentos: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [notify, setSelected]);

  useEffect(() => {
    void load();
  }, [load]);

  // Expirado o desfazer, os arquivos do lote excluído são apagados do servidor.
  const discardUndoDelete = useCallback(() => {
    setUndoItems([]);
    const trashId = undoTrashIdRef.current;
    undoTrashIdRef.current = "";
    if (!trashId) return;
    void api("/api/equipments/trash/purge", {
      method: "POST",
      body: JSON.stringify({ trashId }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!undoItems.length) return;
    const t = window.setTimeout(discardUndoDelete, 3000);
    return () => window.clearTimeout(t);
  }, [undoItems, discardUndoDelete]);

  useEffect(() => {
    if (!undoAssets.length) return;
    const t = window.setTimeout(() => setUndoAssets([]), 3000);
    return () => window.clearTimeout(t);
  }, [undoAssets]);

  async function changeQuantity(item: Equipment, delta: -1 | 1) {
    const currentQuantity = Math.max(1, Math.floor(Number(item.quantity) || 1));

    // Ao tentar diminuir de 1 para 0, pede confirmação para excluir.
    if (delta === -1 && currentQuantity === 1) {
      setSelected([item.id]);
      setDeleteOpen(true);
      return;
    }

    const newQuantity = currentQuantity + delta;

    try {
      await api(`/api/equipments/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          ...item,
          quantity: newQuantity,
        }),
      });

      await load();
      notify(`Quantidade atualizada para ${newQuantity}.`);
    } catch (e) {
      notify(`Falha ao atualizar quantidade: ${(e as Error).message}`);
    }
  }

  async function updateStatus(item: Equipment, status: string) {
    try {
      await api(`/api/equipments/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        body: JSON.stringify({ ...item, status }),
      });
      await load();
      notify("Status atualizado.");
    } catch (e) {
      notify(`Falha ao atualizar: ${(e as Error).message}`);
    }
  }

  // Aplica o mesmo status a todos os registros selecionados.
  async function applyBulkStatus() {
    try {
      await Promise.all(
        items
          .filter((i) => selected.includes(i.id))
          .map((i) =>
            api(`/api/equipments/${encodeURIComponent(i.id)}`, {
              method: "PUT",
              body: JSON.stringify({
                ...i,
                status: bulkStatus,
              }),
            }),
          ),
      );
      await load();
      notify("Status atualizado para os registros selecionados.");
    } catch (e) {
      notify(`Falha ao atualizar status: ${(e as Error).message}`);
    }
  }

  async function deleteSelected() {
    if (!selected.length) return;
    setSaving(true);
    try {
      const result = await api<{ items: Equipment[]; trashId?: string }>(
        "/api/equipments",
        {
          method: "DELETE",
          body: JSON.stringify({ ids: selected }),
        },
      );
      undoTrashIdRef.current = result.trashId || "";
      setUndoItems(result.items || []);
      await load();
      setDeleteOpen(false);
      setToast("");
    } catch (e) {
      notify(`Falha ao excluir: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function undoDelete() {
    if (!undoItems.length) return;
    try {
      const trashId = undoTrashIdRef.current;
      const result = await api<{ message: string; lost?: unknown[] }>(
        "/api/equipments/restore",
        {
          method: "POST",
          body: JSON.stringify({ items: undoItems, trashId }),
        },
      );
      undoTrashIdRef.current = "";
      setUndoItems([]);
      await load();
      notify(result.lost?.length ? result.message : "Exclusão desfeita.");
    } catch (e) {
      notify(`Não foi possível desfazer: ${(e as Error).message}`);
    }
  }

  // Desfaz a remoção de termo/imagem feita na edição, reenviando o arquivo salvo.
  async function undoAssetRemoval() {
    if (!undoAssets.length) return;
    try {
      const byId = new Map<string, Equipment>();
      for (const entry of undoAssets) {
        const current = byId.get(entry.item.id) || entry.item;
        byId.set(entry.item.id, {
          ...current,
          [entry.field]: entry.value,
        });
      }
      for (const item of byId.values())
        await api(`/api/equipments/${encodeURIComponent(item.id)}`, {
          method: "PUT",
          body: JSON.stringify(item),
        });
      setUndoAssets([]);
      await load();
      notify("Remoção desfeita.");
    } catch (e) {
      notify(`Não foi possível desfazer: ${(e as Error).message}`);
    }
  }

  return {
    items,
    loading,
    saving,
    setSaving,
    load,
    undoItems,
    undoAssets,
    setUndoAssets,
    changeQuantity,
    updateStatus,
    applyBulkStatus,
    deleteSelected,
    undoDelete,
    discardUndoDelete,
    undoAssetRemoval,
  };
}
