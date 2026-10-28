import { useCallback, useMemo, useState } from "react";
import type { Equipment } from "@/lib/types";

// Detalhe em modo leitura do registro (olho da tabela). Guarda apenas o id: assim o
// modal sempre mostra a versão mais nova do registro, atualizada pela própria tela
// (quantidade, status, termo novo), e some sozinho se o registro for excluído.
export function useEquipmentDetail({ items }: { items: Equipment[] }) {
  const [detailId, setDetailId] = useState("");

  const detailItem = useMemo(
    () => items.find((item) => item.id === detailId) || null,
    [items, detailId],
  );

  const openDetail = useCallback((item: Equipment) => setDetailId(item.id), []);
  const closeDetail = useCallback(() => setDetailId(""), []);

  return { detailId, detailItem, openDetail, closeDetail, setDetailId };
}
