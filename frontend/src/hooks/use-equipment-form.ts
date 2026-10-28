import { useState } from "react";
import { api } from "@/lib/api";
import { emptyForm } from "@/lib/constants";
import { newEquipmentId } from "@/lib/id";
import { readDataUrl } from "@/lib/files";
import type { AssetRemoval, Equipment, FormValues } from "@/lib/types";

type FormOptions = {
  items: Equipment[];
  load: () => Promise<void>;
  setSaving: (saving: boolean) => void;
  setUndoAssets: (assets: AssetRemoval[]) => void;
  notify: (message: string) => void;
};

// Formulário de cadastro/edição do equipamento, incluindo upload de termo e imagem.
export function useEquipmentForm({
  items,
  load,
  setSaving,
  setUndoAssets,
  notify,
}: FormOptions) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [termFile, setTermFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setTermFile(null);
    setImageFile(null);
    setDialogOpen(true);
  };

  const formFromItem = (item: Equipment): FormValues => ({
    name: item.name,
    department: item.department,
    project: item.project || "",
    value: String(item.value ?? 0),
    quantity: String(item.quantity ?? 1),
    status: item.status || "Guardado",
    patrimonio: item.patrimonio || "",
    responsavel: item.responsavel || "",
    term: item.term || "",
    image: item.image || "",
  });

  const openEdit = (item: Equipment) => {
    setEditing(item);
    setForm(formFromItem(item));
    setTermFile(null);
    setImageFile(null);
    setDialogOpen(true);
  };

  // Duplicar: abre o formulário preenchido, mas sem registro em edição.
  const openDuplicate = (item: Equipment) => {
    openEdit(item);
    setEditing(null);
    setForm(formFromItem(item));
  };

  const setField = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => setForm((old) => ({ ...old, [key]: value }));

  // Espelha validation.js: só o termo NOVO exige responsável. Um registro que já
  // estava salvo com o mesmo termo e sem responsável (herança dos cadastros
  // antigos) não pode travar a edição — nem a troca de status na tabela.
  const legadoSemResponsavel = Boolean(
    editing &&
      editing.term &&
      !String(editing.responsavel || "").trim() &&
      form.term === editing.term,
  );
  const responsavelRequired =
    Boolean(termFile) || (Boolean(form.term) && !legadoSemResponsavel);

  async function saveEquipment(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim() || !form.department) {
      notify("Informe o nome e o departamento.");
      return;
    }

    // Único vínculo obrigatório: termo sem responsável. Responsável sem termo é
    // válido — o PDF pode ser gerado depois, no botão Gerar termo da linha.
    if (responsavelRequired && !form.responsavel.trim()) {
      notify("Todo termo de responsabilidade precisa de um responsável.");
      return;
    }

    setSaving(true);

    try {
      const term = termFile ? await readDataUrl(termFile) : form.term;
      const image = imageFile ? await readDataUrl(imageFile) : form.image;

      const payload: Equipment = {
        ...form,
        id: editing?.id || newEquipmentId(),
        name: form.name.trim(),
        department: form.department.trim(),
        project: form.project.trim(),
        value: Number(form.value) || 0,
        quantity: Math.max(1, Math.floor(Number(form.quantity) || 1)),
        status: form.status,
        patrimonio: form.patrimonio.trim(),
        responsavel: form.responsavel.trim(),
        term,
        image,
      };

      // Edição: atualiza somente o registro selecionado.
      if (editing) {
        // O PUT devolve o lote de arquivos que foram para uploads/.trash: é por ele
        // que o desfazer vai buscar o termo/imagem de volta.
        const saved = await api<{ trashId?: string }>(
          `/api/equipments/${encodeURIComponent(editing.id)}`,
          { method: "PUT", body: JSON.stringify(payload) },
        );

        const removedAssets = [
          ...(editing.term && !term
            ? [{ item: editing, field: "term" as const, value: editing.term, trashId: saved.trashId }]
            : []),
          ...(editing.image && !image
            ? [{ item: editing, field: "image" as const, value: editing.image, trashId: saved.trashId }]
            : []),
        ];

        await load();
        setDialogOpen(false);

        if (removedAssets.length) {
          setUndoAssets(removedAssets);
          notify("Arquivo removido. Você pode desfazer em até 3 segundos.");
        } else {
          notify("Equipamento atualizado.");
        }

        return;
      }

      // Cadastro ou duplicação: compara todos os atributos do equipamento.
      const normalizeText = (value?: string | number) =>
        String(value ?? "")
          .normalize("NFC")
          .trim()
          .replace(/\s+/g, " ")
          .toLocaleLowerCase("pt-BR");

      const sameEquipment = (item: Equipment) =>
        normalizeText(item.name) === normalizeText(payload.name) &&
        normalizeText(item.department) === normalizeText(payload.department) &&
        normalizeText(item.project) === normalizeText(payload.project) &&
        Number(item.value || 0) === Number(payload.value || 0) &&
        normalizeText(item.status) === normalizeText(payload.status) &&
        normalizeText(item.patrimonio) === normalizeText(payload.patrimonio) &&
        normalizeText(item.responsavel) ===
          normalizeText(payload.responsavel) &&
        (item.term || "") === (payload.term || "") &&
        (item.image || "") === (payload.image || "");

      const existing = items.find(sameEquipment);

      if (existing) {
        await api(`/api/equipments/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            ...existing,
            quantity: Math.max(1, Number(existing.quantity) || 1) + 1,
          }),
        });

        await load();
        setDialogOpen(false);
        notify("Equipamento já cadastrado. Quantidade aumentada em 1 unidade.");
        return;
      }

      await api("/api/equipments", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await load();
      setDialogOpen(false);
      notify("Equipamento cadastrado.");
    } catch (e) {
      notify(`Não foi possível salvar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return {
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
    openNew,
    openEdit,
    openDuplicate,
    saveEquipment,
  };
}
