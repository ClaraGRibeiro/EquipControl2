import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Image as ImageIcon, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { departments, statuses } from "@/lib/constants";
import { existingImages, filterImages } from "@/lib/image-library";
import { shortFileName } from "@/lib/format";
import { assetUrl } from "@/lib/files";
import { cn } from "@/lib/utils";
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
    responsavelRequired,
    saveEquipment,
  } = store;

  // Duas fontes possíveis para a imagem, uma de cada vez: arquivo do computador ou
  // imagem que já está em uploads/images. Juntas elas deixariam dúvida sobre o que
  // vai ser salvo, então a escolha da lista descarta o arquivo pendente.
  const [imageSource, setImageSource] = useState<"upload" | "library">("upload");
  const [libraryQuery, setLibraryQuery] = useState("");
  // Trocar a chave remonta o <input type="file">: o nome que ele exibe não tem como
  // ser limpo por estado.
  const [fileKeys, setFileKeys] = useState({ term: 0, image: 0 });
  const catalog = useMemo(() => existingImages(items), [items]);
  const gallery = useMemo(() => filterImages(catalog, libraryQuery), [catalog, libraryQuery]);

  // Fechou o modal: na próxima abertura a imagem volta para "Enviar arquivo".
  useEffect(() => {
    if (dialogOpen) return;
    setImageSource("upload");
    setLibraryQuery("");
  }, [dialogOpen]);

  const dropFile = (kind: "term" | "image") => {
    if (kind === "term") setTermFile(null);
    else setImageFile(null);
    setFileKeys((keys) => ({ ...keys, [kind]: keys[kind] + 1 }));
  };

  const chooseImageSource = (source: "upload" | "library") => {
    if (source === "library" && imageFile) dropFile("image");
    setImageSource(source);
  };

  // Só muda o caminho gravado: o arquivo não sobe outra vez e continua compartilhado.
  const useExistingImage = (path: string) => {
    setImageFile(null);
    setField("image", path);
  };

  const sameFile = (path: string) => {
    const current = String(form.image || "").trim();
    if (!current) return false;
    return current === path || current.replace(/^\/?uploads\/images\//, "") === path.replace(/^\/?uploads\/images\//, "");
  };

  return (

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent
        // Sem isso o Radix foca o primeiro campo ao abrir, e no celular o teclado
        // já sobe cobrindo o formulário antes de a pessoa decidir o que editar.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div>
          <DialogTitle className="text-xl font-bold">
            {editing ? "Editar equipamento" : "Novo equipamento"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            Preencha os dados do item. Quando houver termo anexado, o nome do
            responsável é obrigatório.
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
                key={`term-${fileKeys.term}`}
                type="file"
                accept="application/pdf,.pdf"
                className="h-auto py-2"
                onChange={(e) => setTermFile(e.target.files?.[0] || null)}
              />
            </Field>
            <div className="grid gap-1.5">
              <Field label="Imagem do equipamento">
                {imageSource === "upload" ? (
                  <Input
                    key={`image-${fileKeys.image}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
                    className="h-auto py-2"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                ) : (
                  <p className="rounded-md border border-dashed px-3 py-2 text-xs font-normal text-muted-foreground">
                    escolhendo entre as {catalog.length} imagens que já estão
                    cadastradas, logo abaixo
                  </p>
                )}
              </Field>
              <button
                type="button"
                onClick={() =>
                  chooseImageSource(imageSource === "upload" ? "library" : "upload")
                }
                className="justify-self-start text-xs font-medium text-primary underline underline-offset-2"
              >
                {imageSource === "upload"
                  ? "ou usar uma imagem já cadastrada"
                  : "ou enviar um arquivo do computador"}
              </button>
            </div>
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
          {(termFile || imageFile) && (
            <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2 dark:bg-slate-800/60">
              {termFile && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <FileText className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span
                    className="min-w-0 flex-1 truncate text-muted-foreground"
                    title={termFile.name}
                  >
                    PDF selecionado: {shortFileName(termFile.name)}
                  </span>
                  <button
                    type="button"
                    onClick={() => dropFile("term")}
                    className="font-medium text-red-600 underline dark:text-red-400"
                  >
                    Remover PDF selecionado
                  </button>
                </div>
              )}
              {imageFile && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span
                    className="min-w-0 flex-1 truncate text-muted-foreground"
                    title={imageFile.name}
                  >
                    Imagem selecionada: {shortFileName(imageFile.name)}
                  </span>
                  <button
                    type="button"
                    onClick={() => dropFile("image")}
                    className="font-medium text-red-600 underline dark:text-red-400"
                  >
                    Remover imagem selecionada
                  </button>
                </div>
              )}
            </div>
          )}
          {imageSource === "library" && (
            <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Imagens cadastradas
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                    placeholder="Filtrar por equipamento..."
                    className="h-9 w-full max-w-[240px]"
                  />
                  <button
                    type="button"
                    onClick={() => chooseImageSource("upload")}
                    className="text-xs font-medium text-primary underline underline-offset-2"
                  >
                    Fechar
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                O registro passa a apontar para o arquivo que já está em{" "}
                <code>uploads/images</code>: nada é enviado de novo, e enquanto
                outro equipamento usar o mesmo arquivo ele não é apagado.
              </p>
              {gallery.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {catalog.length
                    ? "Nenhuma imagem corresponde ao filtro."
                    : "Nenhum equipamento tem imagem cadastrada ainda."}
                </p>
              ) : (
                <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                  {gallery.map((image) => {
                    const active = sameFile(image.path);
                    return (
                      <button
                        key={image.path}
                        type="button"
                        title={`${image.owners.join(", ")} — ${image.count} registro(s)`}
                        onClick={() => useExistingImage(image.path)}
                        className={cn(
                          "rounded-md border bg-white p-2 text-left transition-colors hover:border-primary dark:bg-slate-900",
                          active && "border-primary ring-2 ring-ring",
                        )}
                      >
                        <img
                          src={assetUrl(image.path)}
                          alt={image.label}
                          className="h-16 w-full rounded border object-cover"
                        />
                        <span className="mt-1 block truncate text-xs font-medium">
                          {image.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {active
                            ? "em uso neste registro"
                            : `${image.count} registro(s)`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
