import { useState } from "react";

export function useSelection() {
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("Guardado");

  return {
    selected,
    setSelected,
    expandedGroups,
    setExpandedGroups,
    deleteOpen,
    setDeleteOpen,
    bulkStatus,
    setBulkStatus,
  };
}
