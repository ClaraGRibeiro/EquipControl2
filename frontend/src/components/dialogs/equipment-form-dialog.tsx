import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, LoaderCircle } from "lucide-react";
import { departments, statuses } from "@/lib/constants";
import { shortFileName } from "@/lib/format";
import { assetUrl } from "@/lib/files";
import type { InventoryController } from "@/hooks/use-inventory";

export function EquipmentFormDialog({ store }: { store: InventoryController }) {
  const {
    notify,
    items,
    saving,
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setField,
    termFile,
    setTermFile,
    imageFile,
    setImageFile,
    attachLater,
    setAttachLater,
    responsavelRequired,
    saveEquipment,
  } = store;

  return (

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <div>
          <DialogTitle className="text-xl font-bold">
            {editing ? "Editar equipamento" : "Novo equipamento"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            Preencha os dados do item. Todo termo precisa de um responsável, mas
            o responsável pode ser atribuído agora e o termo anexado depois.
          </DialogDescription>
        </div>
        <form onSubmit={saveEquipment} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do equipamento" required>
              <Input
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ex.: Notebook Dell"
              />
            </Field>
            <Field label="Departamento" required>
              <Select
                value={form.department}
                onValueChange={(v) => setField("department", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...new Set([
                      ...departments,
                      ...(form.department &&
                      !departments.includes(form.department)
                        ? [form.department]
                        : []),
                    ]),
                  ].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Projeto / fonte do recurso">
              <Select
                value={form.project || "__sem_projeto__"}
                onValueChange={(v) =>
                  setField("project", v === "__sem_projeto__" ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__sem_projeto__">
                    Sem projeto / não informado
                  </SelectItem>
                  {[
                    ...new Set([
                      ...items
                        .map((i) => (i.project || "").trim())
                        .filter(Boolean),
                      ...(form.project.trim() ? [form.project.trim()] : []),
                    ]),
                  ]
                    .sort((a, b) => a.localeCompare(b, "pt-BR"))
                    .map((project) => (
                      <SelectItem
                        key={project}
                        value={project}
                        textValue={project}
                      >
                        <span
                          className="block max-w-[220px] truncate"
                          title={project}
                        >
                          {project}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Valor unitário (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => setField("value", e.target.value)}
              />
            </Field>
            <Field label="Quantidade" required>
              <Input
                type="number"
                min="1"
                step="1"
                required
                value={form.quantity}
                onChange={(e) => setField("quantity", e.target.value)}
              />
            </Field>
            <Field label="Patrimônio">
              <Input
                value={form.patrimonio}
                onChange={(e) => setField("patrimonio", e.target.value)}
                placeholder="Número de patrimônio"
              />
            </Field>
            <Field label="Responsável" required={responsavelRequired}>
              <Input
                value={form.responsavel}
                onChange={(e) => setField("responsavel", e.target.value)}
                placeholder="Nome do responsável"
                required={responsavelRequired}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="PDF do termo">
              <Input
                type="file"
                accept="application/pdf,.pdf"
                className="h-auto py-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={attachLater}
                onChange={(e) => setTermFile(e.target.files?.[0] || null)}
              />
            </Field>
            {!form.term && !termFile && (
              <label className="flex items-start gap-2 rounded-lg border border-dashed bg-slate-50 p-3 text-sm sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={attachLater}
                  onChange={(e) => {
                    setAttachLater(e.target.checked);
                    if (e.target.checked) setTermFile(null);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-700 dark:accent-teal-400"
                />
                <span>
                  <span className="font-medium">Anexar o termo depois</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Salva o equipamento com o responsável atribuído e nenhum PDF.
                    Depois é só usar “Gerar termo” na linha: o nome do
                    responsável já vem preenchido.
                  </span>
                </span>
              </label>
            )}
            <Field label="Imagem do equipamento">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
                className="h-auto py-2"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </Field>
          </div>
          {(form.term || form.image) && (
            <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2 dark:bg-slate-800/60">
              {form.term && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">PDF atual</p>
                    <a
                      className="text-xs text-primary underline"
                      href={assetUrl(form.term)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir documento
                    </a>
                    <button
                      type="button"
                      className="mt-2 block text-xs font-medium text-red-600 underline dark:text-red-400"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Deseja remover o PDF deste equipamento?",
                          )
                        ) {
                          setField("term", "");
                          notify(
                            "PDF removido do formulário. Salve em até 3 segundos para confirmar a alteração.",
                          );
                        }
                      }}
                    >
                      Remover PDF
                    </button>
                  </div>
                </div>
              )}
              {form.image && (
                <div className="flex items-center gap-3 text-sm">
                  <img
                    src={assetUrl(form.image)}
                    alt="Imagem atual"
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">Imagem atual</p>
                    <a
                      className="text-xs text-primary underline"
                      href={assetUrl(form.image)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir imagem
                    </a>
                    <button
                      type="button"
                      className="mt-2 block text-xs font-medium text-red-600 underline dark:text-red-400"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Deseja remover a imagem deste equipamento?",
                          )
                        ) {
                          setField("image", "");
                          notify(
                            "Imagem removida do formulário. Salve em até 3 segundos para confirmar a alteração.",
                          );
                        }
                      }}
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {termFile && (
            <p className="text-xs text-muted-foreground" title={termFile.name}>
              PDF selecionado: {shortFileName(termFile.name)}
            </p>
          )}
          {imageFile && (
            <p className="text-xs text-muted-foreground" title={imageFile.name}>
              Imagem selecionada: {shortFileName(imageFile.name)}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar alterações" : "Cadastrar equipamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
