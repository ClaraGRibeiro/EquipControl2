import { useState } from "react";
import { api } from "@/lib/api";
import { emptyTerm, termFields } from "@/lib/constants";
import { generateTermDocument } from "@/lib/term-document";
import type { Equipment, TermValues } from "@/lib/types";

type TermOptions = {
  load: () => Promise<void>;
  notify: (message: string) => void;
  generating: boolean;
  setGenerating: (busy: boolean) => void;
};

// Geração do termo de responsabilidade a partir do template.pdf e anexo no registro.
export function useEquipmentTerm({
  load,
  notify,
  generating,
  setGenerating,
}: TermOptions) {
  const [termItem, setTermItem] = useState<Equipment | null>(null);
  const [termValues, setTermValues] = useState<TermValues>(emptyTerm);

  function openGenerate(item: Equipment) {
    setTermItem(item);
    setTermValues({
      ...emptyTerm,
      projectName: item.project || "",
      responsavel: item.responsavel || "",
      situacao: item.status,
    });
  }

  const setTermField = <K extends keyof TermValues>(
    key: K,
    value: TermValues[K],
  ) => setTermValues((old) => ({ ...old, [key]: value }));

  async function generateTerm(event: React.FormEvent) {
    event.preventDefault();
    if (!termItem) return;
    const missing = termFields.find(([key]) => !termValues[key].trim());
    if (missing) {
      notify(`Preencha o campo: ${missing[1]}.`);
      return;
    }
    setGenerating(true);
    try {
      const data = await generateTermDocument({ item: termItem, termValues });
      await api(`/api/equipments/${encodeURIComponent(termItem.id)}`, {
        method: "PUT",
        body: JSON.stringify({
          ...termItem,
          term: data,
          responsavel: termValues.responsavel,
        }),
      });
      await load();
      setTermItem(null);
      notify("Termo gerado e anexado ao equipamento.");
    } catch (e) {
      notify(`Não foi possível gerar o termo: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  return {
    termItem,
    setTermItem,
    termValues,
    setTermField,
    openGenerate,
    generateTerm,
  };
}
