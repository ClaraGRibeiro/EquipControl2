import { useEffect, useMemo, useState } from "react";
import { filterItems } from "@/lib/filters";
import { buildDisplayRows } from "@/lib/grouping";
import { summarizeInventory } from "@/lib/summary";
import type { Equipment } from "@/lib/types";

// Estado de busca, filtros, ordenação e paginação da tabela.
export function useInventoryView(items: Equipment[], expandedGroups: string[]) {
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("50");

  const filtered = useMemo(
    () =>
      filterItems(items, {
        query,
        department: departmentFilter,
        status: statusFilter,
        project: projectFilter,
      }),
    [items, query, departmentFilter, statusFilter, projectFilter],
  );

  useEffect(() => {
    setPage(1);
  }, [query, departmentFilter, statusFilter, projectFilter, pageSize]);

  const pageSizeNumber = Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSizeNumber));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSizeNumber, page * pageSizeNumber),
    [filtered, page, pageSizeNumber],
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const displayRows = useMemo(
    () => buildDisplayRows(pageItems, expandedGroups),
    [pageItems, expandedGroups],
  );

  const counts = useMemo(() => summarizeInventory(items), [items]);

  return {
    query,
    setQuery,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeNumber,
    pageCount,
    filtered,
    pageItems,
    displayRows,
    counts,
  };
}
