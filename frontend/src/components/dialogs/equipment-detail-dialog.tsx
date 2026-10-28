import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy,
  Eye,
  FilePlus2,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { statusBadgeClass } from "@/lib/constants";
import { assetUrl } from "@/lib/files";
import { dateTime, fileName, money } from "@/lib/format";
import type { InventoryController } from "@/hooks/use-inventory";
import type { ReactNode } from "react";

// Caixa de um campo do detalhe: rótulo pequeno em cima, valor completo embaixo.
// Quebra a palavra em vez de cortar, então nome/projeto longos aparecem por inteiro.
function Fact({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 break-words whitespace-pre-wrap text-sm font-medium text-slate-800 dark:text-slate-100 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// Modal de leitura: tudo que o registro tem, sem corte de coluna, com a imagem
// grande e a prévia do termo. Guarda o id, então reflete alterações feitas aqui dentro.
export function EquipmentDetailDialog({
  store,
}: {
  store: InventoryController;
}) {
  const {
    detailItem: item,
    closeDetail,
    setDetailId,
    items,
    openEdit,
    openDuplicate,
    openGenerate,
    setSelected,
    setDeleteOpen,
  } = store;

  const siblings = item
    ? items.filter(
        (other) =>
          other.id !== item.id &&
          other.name.trim().toLocaleLowerCase("pt-BR") ===
            item.name.trim().toLocaleLowerCase("pt-BR"),
      )
    : [];
  const quantity = Math.max(0, Number(item?.quantity) || 0);
  const unitValue = Number(item?.value) || 0;

  // Ação de outro diálogo: fecha o detalhe antes para não empilhar dois modais.
  const handOff = (action: () => void) => () => {
    closeDetail();
    action();
  };

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) closeDetail();
      }}
    >
      <DialogContent className="max-w-4xl gap-0 p-0">
        {item && (
          <>
            <div className="border-b border-slate-200 bg-slate-50 p-6 pr-12 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex items-start gap-4">
                {item.image ? (
                  <img
                    src={assetUrl(item.image)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                    <HardDrive className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <DialogTitle className="break-words text-xl leading-snug font-bold">
                    {item.name}
                  </DialogTitle>
                  <DialogDescription className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {item.department}
                    </span>
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(item.status)}
                    >
                      {item.status}
                    </Badge>
                    <span className="text-slate-500 dark:text-slate-400">
                      {quantity} {quantity === 1 ? "unidade" : "unidades"}
                      {siblings.length
                        ? ` · ${siblings.length + 1} registros com o mesmo nome`
                        : ""}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Foto do equipamento
                </p>
                {item.image ? (
                  <a
                    href={assetUrl(item.image)}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir imagem em tamanho real"
                    className="block overflow-hidden rounded-xl border bg-slate-50 dark:bg-slate-900/50"
                  >
                    <img
                      src={assetUrl(item.image)}
                      alt={`Imagem de ${item.name}`}
                      className="max-h-[420px] w-full object-contain"
                    />
                  </a>
                ) : (
                  <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-slate-400 dark:text-slate-500">
                    <ImageIcon className="h-7 w-7" />
                    <p className="text-sm font-medium">
                      Nenhuma imagem cadastrada
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Fact
                  label="Patrimônio"
                  value={item.patrimonio || "Não informado"}
                />
                <Fact label="Quantidade" value={quantity} />
                <Fact label="Valor unitário" value={money(unitValue)} />
                <Fact label="Valor total" value={money(unitValue * quantity)} />
                <Fact
                  label="Responsável"
                  value={
                    item.responsavel || (
                      <span className="text-slate-400 dark:text-slate-500">
                        Não atribuído
                      </span>
                    )
                  }
                />
                <Fact label="Status" value={item.status} />
                <Fact
                  label="Projeto / fonte do recurso"
                  wide
                  value={
                    item.project || (
                      <span className="text-slate-400 dark:text-slate-500">
                        Sem projeto
                      </span>
                    )
                  }
                />
                <Fact label="Registro" value={item.id} mono />
                <Fact
                  label="Cadastrado em"
                  value={
                    item.created_at
                      ? dateTime(item.created_at)
                      : "Data não registrada"
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              {item.term && (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Termo de responsabilidade
                        </p>
                        <p
                          className="mt-0.5 break-all text-xs text-muted-foreground"
                          title={item.term}
                        >
                          {fileName(item.term)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={assetUrl(item.term)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border bg-white px-2 py-1 text-xs font-medium hover:bg-muted dark:bg-slate-800"
                    >
                      Abrir PDF
                    </a>
                  </div>
                  <iframe
                    src={assetUrl(item.term)}
                    title={`Prévia do termo de ${item.name}`}
                    loading="lazy"
                    className="mt-3 h-72 w-full rounded-lg border bg-white dark:border-slate-700"
                  />
                </div>
              )}
              {item.image && (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Imagem do equipamento
                        </p>
                        <p
                          className="mt-0.5 break-all text-xs text-muted-foreground"
                          title={item.image}
                        >
                          {fileName(item.image)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={assetUrl(item.image)}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-md border bg-white px-2 py-1 text-xs font-medium hover:bg-muted dark:bg-slate-800"
                    >
                      Abrir imagem
                    </a>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Clique na foto acima para abrir em tamanho real.
                  </div>
                </div>
              )}
              {!item.term && (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        Termo ainda não anexado
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.responsavel
                          ? `Responsável atribuído: ${item.responsavel}. Use “Gerar termo” na linha para criar e anexar o PDF.`
                          : 'Use “Gerar termo” na linha para criar o PDF do termo de responsabilidade.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {siblings.length > 0 && (
              <div className="border-t border-slate-200 p-6 dark:border-slate-700">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Outros registros com o mesmo nome
                </p>
                <div className="space-y-2">
                  {siblings.map((other) => (
                    <button
                      key={other.id}
                      type="button"
                      onClick={() => setDetailId(other.id)}
                      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
                    >
                      <Eye className="h-3.5 w-3.5 text-teal-700 dark:text-teal-300" />
                      <span className="font-medium">
                        Patrimônio: {other.patrimonio || "—"}
                      </span>
                      <span className="text-muted-foreground">
                        Qtd. {Number(other.quantity) || 0} ·{" "}
                        {money(Number(other.value) || 0)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={statusBadgeClass(other.status)}
                      >
                        {other.status}
                      </Badge>
                      <span className="ml-auto text-muted-foreground">
                        Ver este registro
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              {!item.term && (
                <Button size="sm" onClick={handOff(() => openGenerate(item))}>
                  <FileText className="h-4 w-4" /> Gerar termo
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handOff(() => openDuplicate(item))}
              >
                <Copy className="h-4 w-4" /> Duplicar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handOff(() => openEdit(item))}
              >
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 dark:text-red-400"
                onClick={handOff(() => {
                  setSelected([item.id]);
                  setDeleteOpen(true);
                })}
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
