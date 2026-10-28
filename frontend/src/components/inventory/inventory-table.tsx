import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronDown,
  ClipboardList,
  Eye,
  FilePlus2,
  HardDrive,
  LoaderCircle,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { statuses, statusBadgeClass } from "@/lib/constants";
import { money } from "@/lib/format";
import { assetUrl } from "@/lib/files";
import type { InventoryController } from "@/hooks/use-inventory";

export function InventoryTable({ store }: { store: InventoryController }) {
  const {
    selected,
    setSelected,
    expandedGroups,
    setExpandedGroups,
    setDeleteOpen,
    items,
    loading,
    updateStatus,
    filtered,
    displayRows,
    openEdit,
    openDuplicate,
    openGenerate,
    openDetail,
    allFilteredSelected,
  } = store;

  return (

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="w-12 px-5 py-3">
                  <input
                    aria-label="Selecionar todos"
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...filtered.map((i) => i.id),
                              ]),
                            ]
                          : selected.filter(
                              (id) => !filtered.some((i) => i.id === id),
                            ),
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-teal-700 dark:border-slate-600 dark:accent-teal-400"
                  />
                </th>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Valor unitário</th>
                <th className="px-4 py-3">Qtd.</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-muted-foreground"
                  >
                    <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Carregando equipamentos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <ClipboardList className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                    </div>
                    <p className="font-medium">
                      Nenhum equipamento encontrado
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Altere os filtros ou cadastre um novo equipamento.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((entry) =>
                  entry.type === "group" ? (
                    <tr
                      key={`group-${entry.key}`}
                      className="border-y border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                    >
                      <td className="px-5 py-4">
                        <input
                          aria-label={`Selecionar grupo ${entry.name}`}
                          type="checkbox"
                          checked={entry.items.every((i) =>
                            selected.includes(i.id),
                          )}
                          ref={(el) => {
                            if (el)
                              el.indeterminate =
                                entry.items.some((i) =>
                                  selected.includes(i.id),
                                ) &&
                                !entry.items.every((i) =>
                                  selected.includes(i.id),
                                );
                          }}
                          onChange={(e) =>
                            setSelected((old) =>
                              e.target.checked
                                ? [
                                    ...new Set([
                                      ...old,
                                      ...entry.items.map((i) => i.id),
                                    ]),
                                  ]
                                : old.filter(
                                    (id) =>
                                      !entry.items.some((i) => i.id === id),
                                  ),
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 accent-teal-700 dark:border-slate-600 dark:accent-teal-400"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={
                              expandedGroups.includes(entry.key)
                                ? "Recolher grupo"
                                : "Expandir grupo"
                            }
                            onClick={() =>
                              setExpandedGroups((old) =>
                                old.includes(entry.key)
                                  ? old.filter((k) => k !== entry.key)
                                  : [...old, entry.key],
                              )
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-teal-200 bg-white text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-500/15"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${expandedGroups.includes(entry.key) ? "" : "-rotate-90"}`}
                            />
                          </button>

                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-50">
                              {entry.name}
                            </p>
                            <p className="mt-0.5 text-xs text-teal-800 dark:text-teal-300">
                              {entry.items.length} registros agrupados ·{" "}
                              {entry.items.reduce(
                                (sum, i) =>
                                  sum + Math.max(0, Number(i.quantity) || 0),
                                0,
                              )}{" "}
                              unidades
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                        {[
                          ...new Set(entry.items.map((i) => i.department)),
                        ].join(", ")}
                      </td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400">...</td>
                      <td className="px-4 py-4 font-medium tabular-nums">
                        {money(
                          entry.items.reduce(
                            (sum, i) =>
                              sum +
                              (Number(i.value) || 0) *
                                (Number(i.quantity) || 1),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-4 font-semibold tabular-nums">
                        {entry.items.reduce(
                          (sum, i) =>
                            sum + Math.max(0, Number(i.quantity) || 0),
                          0,
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {statuses.map((status) => {
                            const count = entry.items.filter(
                              (i) => i.status === status,
                            ).length;
                            return count ? (
                              <Badge
                                key={status}
                                className={statusBadgeClass(status)}
                              >
                                {status}: {count}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedGroups((old) =>
                              old.includes(entry.key)
                                ? old.filter((k) => k !== entry.key)
                                : [...old, entry.key],
                            )
                          }
                        >
                          {expandedGroups.includes(entry.key)
                            ? "Recolher"
                            : "Ver unidades"}
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const item = entry.item;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${entry.parentKey ? "bg-slate-50/60 dark:bg-slate-800/50" : ""}`}
                        >
                          <td className="px-5 py-4">
                            <input
                              aria-label={`Selecionar ${item.name}`}
                              type="checkbox"
                              checked={selected.includes(item.id)}
                              onChange={(e) =>
                                setSelected((old) =>
                                  e.target.checked
                                    ? [...old, item.id]
                                    : old.filter((id) => id !== item.id),
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300 accent-teal-700 dark:border-slate-600 dark:accent-teal-400"
                            />
                          </td>
                          <td
                            className={`px-4 py-4 ${entry.parentKey ? "border-l-4 border-l-slate-200 dark:border-l-slate-700" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              {item.image ? (
                                <img
                                  src={assetUrl(item.image)}
                                  alt=""
                                  className="h-16 w-16 rounded-lg border object-cover"
                                />
                              ) : (
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-slate-50 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
                                  <HardDrive className="h-5 w-5" />
                                </div>
                              )}
                              <div>
                                <p
                                  className="max-w-[230px] truncate font-semibold text-slate-800 dark:text-slate-100"
                                  title={item.name}
                                >
                                  {item.name}
                                </p>
                                {items.filter(
                                  (x) =>
                                    x.name
                                      .trim()
                                      .toLocaleLowerCase("pt-BR") ===
                                    item.name
                                      .trim()
                                      .toLocaleLowerCase("pt-BR"),
                                ).length > 1 && (
                                  <p className="mt-1 inline-flex rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">
                                    Grupo ·{" "}
                                    {
                                      items.filter(
                                        (x) =>
                                          x.name
                                            .trim()
                                            .toLocaleLowerCase("pt-BR") ===
                                          item.name
                                            .trim()
                                            .toLocaleLowerCase("pt-BR"),
                                      ).length
                                    }{" "}
                                    registros
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Projeto:{" "}
                                  {item.project
                                    ?.split(" ")
                                    .slice(0, 3)
                                    .join(" ") + "..." || "Não informado"}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Patrimônio: {item.patrimonio || "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {item.department}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                            {item.responsavel || (
                              <span className="text-slate-400">
                                Não atribuído
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 font-medium tabular-nums">
                            {money(item.value)}
                          </td>

                          <td className="px-4 py-4 font-semibold tabular-nums">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-4">
                            <Select
                              value={item.status}
                              onValueChange={(v) =>
                                void updateStatus(item, v)
                              }
                            >
                              {/* w-auto: o seletor deixa de ter largura fixa e passa a
                                  abbriciar o selo, então "Em Uso" não ocupa espaço de "Manutenção" */}
                              <SelectTrigger className="h-8 w-auto min-w-0 gap-1 border-0 bg-transparent px-1 shadow-none focus:ring-1">
                                <Badge
                                  variant="secondary"
                                  className={statusBadgeClass(item.status)}
                                >
                                  {item.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {statuses.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Gerar termo"
                                aria-label={`Gerar termo de ${item.name}`}
                                onClick={() => openGenerate(item)}
                              >
                                <FilePlus2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver detalhes"
                                aria-label={`Ver detalhes de ${item.name}`}
                                onClick={() => openDetail(item)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Duplicar registro"
                                onClick={() => openDuplicate(item)}
                              >
                                <ClipboardList className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir"
                                onClick={() => {
                                  setSelected([item.id]);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })()
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
  );
}
