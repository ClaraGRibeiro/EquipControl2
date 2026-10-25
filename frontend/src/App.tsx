import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Archive,
  ArrowDownToLine,
  Check,
  ChevronDown,
  ClipboardList,
  FilePlus2,
  FileText,
  HardDrive,
  Image as ImageIcon,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Equipment = {
  id: string;
  name: string;
  department: string;
  project?: string;
  value: number | string;
  quantity: number | string;
  status: string;
  patrimonio?: string;
  responsavel?: string;
  term?: string;
  image?: string;
  created_at?: string;
};
type FormValues = {
  name: string;
  department: string;
  project: string;
  value: string;
  quantity: string;
  status: string;
  patrimonio: string;
  responsavel: string;
  term: string;
  image: string;
};
type TermValues = {
  projectName: string;
  edital: string;
  processo: string;
  pedido: string;
  compra: string;
  nota: string;
  aquisicao: string;
  situacao: string;
  responsavel: string;
  cpf: string;
  recebimento: string;
};
const emptyForm: FormValues = {
  name: "",
  department: "",
  project: "",
  value: "0",
  quantity: "1",
  status: "Guardado",
  patrimonio: "",
  responsavel: "",
  term: "",
  image: "",
};
const emptyTerm: TermValues = {
  projectName: "",
  edital: "",
  processo: "",
  pedido: "",
  compra: "",
  nota: "",
  aquisicao: "",
  situacao: "",
  responsavel: "",
  cpf: "",
  recebimento: "",
};
const departments = ["hardware", "software", "imobiliário"];
const statuses = ["Guardado", "Em Uso", "Manutenção"];
const termFields: [keyof TermValues, string, string][] = [
  ["projectName", "Nome do projeto", "text"],
  ["edital", "Edital nº", "text"],
  ["processo", "Processo", "text"],
  ["pedido", "Número do pedido", "text"],
  ["compra", "Processo de compra", "text"],
  ["nota", "Nota fiscal nº", "text"],
  ["aquisicao", "Data da aquisição", "date"],
  ["situacao", "Situação do equipamento", "text"],
  ["responsavel", "Nome do responsável", "text"],
  ["cpf", "Matrícula/CPF", "text"],
  ["recebimento", "Data do recebimento", "date"],
];
const truncateWords = (text: string, limit = 3) => {
  const words = text.trim().split(/\s+/);
  return words.length > limit ? `${words.slice(0, limit).join(" ")}...` : text;
};
function money(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function assetUrl(path?: string) {
  if (!path) return "";
  return path.startsWith("http") || path.startsWith("data:") ? path : path;
}
function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}
async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  return data as T;
}
function Toast({ message, onClose, onUndo }: { message: string; onClose: () => void; onUndo?: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(id);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg">
      <Check className="h-4 w-4 text-emerald-600" />
      <span>{message}</span>
      {onUndo && <button className="ml-2 font-semibold text-primary underline" onClick={onUndo}>Desfazer</button>}
      <button className="ml-2 text-muted-foreground" onClick={onClose}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      <span>
        {label}
        {required ? (
          <span className="ml-1 text-red-600" aria-label="obrigatório">
            *
          </span>
        ) : (
          <span className="ml-1 font-normal text-slate-400">(opcional)</span>
        )}
      </span>
      {children}
    </label>
  );
}
function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem("equipcontrol-auth") === "ok",
  );
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [undoItems, setUndoItems] = useState<Equipment[]>([]);
  const [undoAssets, setUndoAssets] = useState<Array<{ item: Equipment; field: "term" | "image"; value: string }>>([]);
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [bulkStatus, setBulkStatus] = useState("Guardado");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [termItem, setTermItem] = useState<Equipment | null>(null);
  const [termValues, setTermValues] = useState<TermValues>(emptyTerm);
  const [generating, setGenerating] = useState(false);
  const [termFile, setTermFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const notify = useCallback((message: string) => setToast(message), []);
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
  }, [notify]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!undoItems.length) return;
    const t = window.setTimeout(() => setUndoItems([]), 3000);
    return () => window.clearTimeout(t);
  }, [undoItems]);
  useEffect(() => {
    if (!undoAssets.length) return;
    const t = window.setTimeout(() => setUndoAssets([]), 3000);
    return () => window.clearTimeout(t);
  }, [undoAssets]);
  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const q = query.toLocaleLowerCase("pt-BR").trim();
        return (
          (!q ||
            i.name.toLocaleLowerCase("pt-BR").includes(q) ||
            (i.patrimonio || "").toLocaleLowerCase("pt-BR").includes(q) ||
            (i.responsavel || "").toLocaleLowerCase("pt-BR").includes(q) ||
            (i.project || "").toLocaleLowerCase("pt-BR").includes(q)) &&
          (departmentFilter === "all" || i.department === departmentFilter) &&
          (statusFilter === "all" || i.status === statusFilter) &&
          (projectFilter === "all" ||
            (i.project?.trim() || "Sem projeto") === projectFilter)
        );
      }),
    [items, query, departmentFilter, statusFilter, projectFilter],
  );
  useEffect(() => { setPage(1); }, [query, departmentFilter, statusFilter, projectFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const pageItems = useMemo(() => filtered.slice((page - 1) * 10, page * 10), [filtered, page]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const displayRows = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("pt-BR");
    const map = new Map<string, Equipment[]>();
    for (const item of pageItems) {
      const key = normalize(item.name || "Sem descrição");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const rows: Array<
      | { type: "group"; key: string; name: string; items: Equipment[] }
      | { type: "item"; key: string; item: Equipment; parentKey?: string }
    > = [];
    for (const [key, groupItems] of [...map.entries()].sort((a, b) =>
      a[1][0].name.localeCompare(b[1][0].name, "pt-BR"),
    )) {
      if (groupItems.length > 1) {
        rows.push({
          type: "group",
          key,
          name: groupItems[0].name,
          items: groupItems,
        });
        if (expandedGroups.includes(key))
          for (const item of groupItems)
            rows.push({ type: "item", key: item.id, item, parentKey: key });
      } else
        rows.push({ type: "item", key: groupItems[0].id, item: groupItems[0] });
    }
    return rows;
  }, [pageItems, expandedGroups]);

  const counts = useMemo(
    () => ({
      total: items.reduce(
        (s, i) => s + Math.max(0, Number(i.quantity) || 0),
        0,
      ),
      inUse: items
        .filter((i) => i.status === "Em Uso")
        .reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
      stored: items
        .filter((i) => i.status === "Guardado")
        .reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
      maintenance: items
        .filter((i) => i.status === "Manutenção")
        .reduce((s, i) => s + Math.max(0, Number(i.quantity) || 0), 0),
    }),
    [items],
  );
  if (!loggedIn)
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <form
            className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (loginUser === "admin" && loginPassword === "otmg123") {
                localStorage.setItem("equipcontrol-auth", "ok");
                setLoggedIn(true);
              } else notify("Usuário ou senha incorretos.");
            }}
          >
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                <Package />
              </div>
              <h1 className="mt-4 text-2xl font-bold">EquipControl</h1>
              <p className="mt-1 text-sm text-slate-500">
                Entre para acessar o inventário do OTMG
              </p>
            </div>
            <Field label="Usuário" required>
              <Input
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                required
                autoComplete="username"
              />
            </Field>
            <Field label="Senha" required>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            <Button className="w-full" type="submit">
              Entrar
            </Button>
            <p className="text-center text-xs text-slate-500">
              Acesso interno OTMG
            </p>
          </form>
        </main>
        <footer className="border-t bg-white px-4 py-5 text-center text-xs text-slate-500">
          OTMG · Todos os direitos reservados · Desenvolvido por{" "}
          <a
            className="font-medium text-primary underline"
            href="https://www.linkedin.com/in/clara-gon%C3%A7alves-ribeiro-66b07a213/"
            target="_blank"
            rel="noreferrer"
          >
            Clara Ribeiro
          </a>
        </footer>
        <Toast message={toast} onClose={() => { setToast(""); setUndoAssets([]); }} onUndo={undoAssets.length ? () => { void (async () => { try { const byId = new Map<string, Equipment>(); for (const entry of undoAssets) { const current = byId.get(entry.item.id) || entry.item; byId.set(entry.item.id, { ...current, [entry.field]: entry.value }); } for (const item of byId.values()) await api(`/api/equipments/${encodeURIComponent(item.id)}`, { method: "PUT", body: JSON.stringify(item) }); setUndoAssets([]); await load(); notify("Remoção desfeita."); } catch (e) { notify(`Não foi possível desfazer: ${(e as Error).message}`); } })(); } : undefined} />
      </div>
    );
  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setTermFile(null);
    setImageFile(null);
    setDialogOpen(true);
  };
  const openEdit = (item: Equipment) => {
    setEditing(item);
    setForm({
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
    setTermFile(null);
    setImageFile(null);
    setDialogOpen(true);
  };
  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((old) => ({ ...old, [key]: value }));
  async function saveEquipment(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.department) {
      notify("Informe o nome e o departamento.");
      return;
    }
    if (Boolean(form.responsavel.trim()) !== Boolean(termFile || form.term)) {
      notify(
        "Responsável e termo de compromisso são obrigatórios um quando o outro for informado.",
      );
      return;
    }
    setSaving(true);
    try {
      const term = termFile ? await readDataUrl(termFile) : form.term;
      const image = imageFile ? await readDataUrl(imageFile) : form.image;
      const payload = {
        ...form,
        id:
          editing?.id ||
          `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
        value: Number(form.value) || 0,
        quantity: Math.max(1, Number(form.quantity) || 1),
        term,
        image,
        responsavel: form.responsavel.trim(),
      };
      if (editing)
        await api(`/api/equipments/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      else
        await api("/api/equipments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      await load();
      setDialogOpen(false);
      const removedAssets = editing ? ([
        ...(editing.term && !term ? [{ item: editing, field: "term" as const, value: editing.term }] : []),
        ...(editing.image && !image ? [{ item: editing, field: "image" as const, value: editing.image }] : []),
      ]) : [];
      if (removedAssets.length) {
        setUndoAssets(removedAssets);
        notify("Arquivo removido. Você pode desfazer em até 3 segundos.");
      } else notify(editing ? "Equipamento atualizado." : "Equipamento cadastrado.");
    } catch (e) {
      notify(`Não foi possível salvar: ${(e as Error).message}`);
    } finally {
      setSaving(false);
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
  async function deleteSelected() {
    if (!selected.length) return;
    setSaving(true);
    try {
      const result = await api<{ items: Equipment[] }>("/api/equipments", {
        method: "DELETE",
        body: JSON.stringify({ ids: selected }),
      });
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
      const templateResponse = await fetch("/template.pdf");
      if (!templateResponse.ok)
        throw new Error("Não foi possível carregar template.pdf.");
      const pdf = await PDFDocument.load(await templateResponse.arrayBuffer());
      const page = pdf.getPages()[0];
      const { width, height } = page.getSize();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      page.drawRectangle({
        x: 48,
        y: 45,
        width: width - 96,
        height: height - 100,
        color: rgb(1, 1, 1),
      });
      const lines = [
        ["TERMO DE RESPONSABILIDADE DE USO E GUARDA DE EQUIPAMENTO", ""],
        ["Nome do Projeto: ", termValues.projectName],
        ["Edital nº: ", termValues.edital],
        ["Processo: ", termValues.processo],
        ["Número do Pedido: ", termValues.pedido],
        ["Processo de compra: ", termValues.compra],
        ["Nota Fiscal nº: ", termValues.nota],
        ["Data da Aquisição: ", termValues.aquisicao],
        ["Valor do Equipamento: ", money(termItem.value)],
        ["Situação do Equipamento: ", termValues.situacao],
        ["Número do Patrimônio: ", termItem.patrimonio || "Não informado"],
        ["Dados do Equipamento: ", termItem.name],
        ["Responsável: ", termValues.responsavel],
        ["Matrícula/CPF: ", termValues.cpf],
        ["Data do recebimento: ", termValues.recebimento],
        ["", ""],
        [
          "Declaro que recebi o equipamento descrito acima e me responsabilizo por sua guarda, uso adequado, manutenção, conservação e devolução quando solicitado.",
        ],
        [
          "Comprometo-me a utilizar o equipamento exclusivamente para fins institucionais, zelar por sua integridade e comunicar imediatamente qualquer dano, perda ou irregularidade.",
        ],
        ["", ""],
        [
          "Assinatura do responsável: ______________________________________________",
        ],
        [
          "Assinatura do responsável pelo patrimônio: _______________________________",
        ],
      ];
      let y = height - 72;
      for (let idx = 0; idx < lines.length; idx++) {
        const [label, value] = lines[idx];
        if (idx === 0) {
          const text = label;
          page.drawText(text, {
            x: Math.max(42, (width - bold.widthOfTextAtSize(text, 12)) / 2),
            y,
            size: 12,
            font: bold,
            color: rgb(0.08, 0.08, 0.08),
          });
          y -= 30;
          continue;
        }
        const text = `${label}${value}`;
        if (text.trim()) {
          const size = idx > 15 ? 9 : 10;
          const words = text.split(/\s+/);
          let line = "",
            lineNo = 0;
          for (const word of words) {
            const candidate = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) > width - 100 && line) {
              page.drawText(line, {
                x: 52,
                y,
                size,
                font: idx < 15 ? font : font,
                color: rgb(0.08, 0.08, 0.08),
              });
              y -= 13;
              line = word;
              lineNo++;
            } else line = candidate;
          }
          if (line)
            page.drawText(line, {
              x: 52,
              y,
              size,
              font: idx === 0 ? bold : font,
              color: rgb(0.08, 0.08, 0.08),
            });
          y -= idx > 15 ? 18 : 16;
        } else y -= 8;
        if (y < 40) {
          const next = pdf.addPage();
          y = next.getHeight() - 50;
        }
      }
      const bytes = await pdf.save();
      const fileBytes = new Uint8Array(bytes.length);
      fileBytes.set(bytes);
      const file = new File([fileBytes.buffer], `termo-${termItem.id}.pdf`, {
        type: "application/pdf",
      });
      const data = await readDataUrl(file);
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
  async function undoDelete() {
    if (!undoItems.length) return;
    try {
      await api("/api/equipments/restore", {
        method: "POST",
        body: JSON.stringify({ items: undoItems }),
      });
      setUndoItems([]);
      await load();
      notify("Exclusão desfeita.");
    } catch (e) {
      notify(`Não foi possível desfazer: ${(e as Error).message}`);
    }
  }

  function exportExcel() {
    if (!items.length) { notify("Não há registros para exportar."); return; }
    const rows = items.map((i) => ({
      Patrimônio: i.patrimonio || "",
      Equipamento: i.name,
      Departamento: i.department,
      "Projeto / fonte do recurso": i.project || "Não informado",
      Responsável: i.responsavel || "",
      "Valor unitário": Number(i.value) || 0,
      Quantidade: Number(i.quantity) || 1,
      Status: i.status,
      PDF: i.term
        ? new URL(i.term, window.location.origin).href
        : "Não anexado",
      Imagem: i.image
        ? new URL(i.image, window.location.origin).href
        : "Sem imagem",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 20 },
      { wch: 32 },
      { wch: 20 },
      { wch: 28 },
      { wch: 25 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 45 },
      { wch: 45 },
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Equipamentos");
    XLSX.writeFile(
      book,
      `equipamentos-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    notify("Planilha Excel baixada.");
  }
  function exportProjectReport() {
    if (!items.length) { notify("Não há registros para gerar o relatório."); return; }
    void (async () => {
      try {
        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
        const projects = new Map<string, Equipment[]>();
        for (const item of items) { const name = (item.project || "").trim() || "Sem projeto"; if (!projects.has(name)) projects.set(name, []); projects.get(name)!.push(item); }
        let pagePdf = pdf.addPage([595.28, 841.89]);
        let y = 790;
        const draw = (text: string, size = 10, isBold = false) => { if (y < 55) { pagePdf = pdf.addPage([595.28, 841.89]); y = 790; } pagePdf.drawText(text.slice(0, 105), { x: 42, y, size, font: isBold ? bold : font, color: rgb(0.12, 0.17, 0.24) }); y -= size + 8; };
        pagePdf.drawRectangle({ x: 0, y: 770, width: 595.28, height: 72, color: rgb(0.04, 0.35, 0.34) });
        pagePdf.drawText("RELATÓRIO DE INVESTIMENTOS POR PROJETO", { x: 35, y: 805, size: 16, font: bold, color: rgb(1,1,1) });
        pagePdf.drawText(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, { x: 35, y: 785, size: 9, font, color: rgb(1,1,1) }); y = 745;
        let grandTotal = 0;
        for (const [project, list] of [...projects.entries()].sort((a,b) => a[0].localeCompare(b[0], "pt-BR"))) {
          const total = list.reduce((sum, i) => sum + (Number(i.value) || 0) * (Number(i.quantity) || 1), 0); grandTotal += total;
          draw(project, 13, true); draw(`${list.length} registro(s)  |  ${list.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)} unidade(s)  |  Total investido: ${money(total)}`, 10, true);
          draw("Equipamento | Quantidade | Valor unitário | Total", 9, true);
          for (const item of list) draw(`${item.name} | ${Number(item.quantity) || 1} | ${money(item.value)} | ${money((Number(item.value) || 0) * (Number(item.quantity) || 1))}`, 8);
          y -= 10;
        }
        y -= 4; draw(`TOTAL GERAL INVESTIDO: ${money(grandTotal)}`, 13, true);
        const bytes = await pdf.save(); const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `relatorio-projetos-${new Date().toISOString().slice(0,10)}.pdf`; a.click(); URL.revokeObjectURL(url); notify("Relatório PDF gerado.");
      } catch (e) { notify(`Não foi possível gerar o relatório: ${(e as Error).message}`); }
    })();
  }
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((i) => selected.includes(i.id));
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Equip<span className="text-primary">Control</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                Gestão de patrimônio e equipamentos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportProjectReport}><FileText className="h-4 w-4" /> PDF por projeto</Button>
            <Button
              variant="outline"
              onClick={exportExcel}
              className="hidden sm:inline-flex"
            >
              <ArrowDownToLine className="h-4 w-4" /> Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("equipcontrol-auth");
                setLoggedIn(false);
              }}
            >
              Sair
            </Button>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo equipamento
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">
              PAINEL DE CONTROLE
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Visão geral do inventário
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe os equipamentos, responsáveis e documentos em um só
              lugar.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Banco de
            dados conectado via API
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total de itens",
              value: counts.total,
              icon: Package,
              desc: "Unidades cadastradas",
              color: "bg-slate-100 text-slate-700",
            },
            {
              label: "Em uso",
              value: counts.inUse,
              icon: ShieldCheck,
              desc: "Unidades em utilização",
              color: "bg-blue-50 text-blue-700",
            },
            {
              label: "Guardados",
              value: counts.stored,
              icon: Archive,
              desc: "Unidades disponíveis",
              color: "bg-violet-100 text-violet-800",
            },
            {
              label: "Em manutenção",
              value: counts.maintenance,
              icon: Wrench,
              desc: "Unidades em reparo",
              color: "bg-amber-100 text-amber-800",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-slate-200/80">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight">
                      {s.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="overflow-hidden border-slate-200/80">
          <CardHeader className="gap-4 border-b bg-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                Equipamentos cadastrados
              </CardTitle>
              <CardDescription className="mt-1">
                {filtered.length} registro(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selected.length} selecionado(s)</span>
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={async () => { try { await Promise.all(items.filter((i) => selected.includes(i.id)).map((i) => api(`/api/equipments/${encodeURIComponent(i.id)}`, { method: "PUT", body: JSON.stringify({ ...i, status: bulkStatus }) }))); await load(); notify("Status atualizado para os registros selecionados."); } catch (e) { notify(`Falha ao atualizar status: ${(e as Error).message}`); } }}>Aplicar status</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="text-white"
                >
                  <Trash2 className="h-4 w-4" /> Excluir ({selected.length})
                </Button>
                </div>
              )}
              
              <Button variant="outline" size="sm" onClick={exportExcel} className="sm:hidden"><ArrowDownToLine className="h-4 w-4" /> Excel</Button>
            </div>
          </CardHeader>
          <div className="grid gap-3 border-b bg-slate-50/70 p-4 md:grid-cols-[minmax(220px,1fr)_200px_180px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por equipamento, patrimônio ou responsável..."
                className="bg-white pl-9 pr-9"
              />
              {query && <button type="button" aria-label="Limpar pesquisa" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {[
                  ...new Set([
                    ...departments,
                    ...items.map((i) => i.department),
                  ]),
                ].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="min-w-0">
                <SelectValue className="truncate" placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const total = (list: Equipment[]) =>
                    list.reduce(
                      (sum, i) =>
                        sum +
                        (Number(i.value) || 0) * (Number(i.quantity) || 0),
                      0,
                    );
                  const fmt = (n: number) =>
                    n.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  const projects = [
                    ...new Set(
                      items.map(
                        (i) => (i.project || "").trim() || "Sem projeto",
                      ),
                    ),
                  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
                  return (
                    <>
                      <SelectItem value="all">Todos os Projetos</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project} value={project} textValue={project}>
                          <span className="block max-w-[175px] truncate" title={project}>{project}</span> (R${" "}
                          {fmt(
                            total(
                              items.filter(
                                (i) =>
                                  ((i.project || "").trim() ||
                                    "Sem projeto") === project,
                              ),
                            ),
                          )}
                          )
                        </SelectItem>
                      ))}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
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
                      className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                    />
                  </th>
                  <th className="px-4 py-3">Equipamento</th>
                  <th className="px-4 py-3">Departamento</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Documentos</th>
                  <th className="px-4 py-3">Valor unitário</th>
                  <th className="px-4 py-3">Qtd.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-muted-foreground"
                    >
                      <LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Carregando equipamentos...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <ClipboardList className="h-6 w-6 text-slate-500" />
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
                        className="border-y border-slate-200 bg-white"
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
                            className="h-4 w-4 rounded border-slate-300 accent-teal-700"
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
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-teal-200 bg-white text-teal-800 hover:bg-teal-100"
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${expandedGroups.includes(entry.key) ? "" : "-rotate-90"}`}
                              />
                            </button>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {entry.name}
                              </p>
                              <p className="mt-0.5 text-xs text-teal-800">
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
                        <td className="px-4 py-4 text-slate-600">
                          {[
                            ...new Set(entry.items.map((i) => i.department)),
                          ].join(", ")}
                        </td>
                        <td className="px-4 py-4 text-slate-500">Todos</td>
                        <td className="px-4 py-4 font-medium">{entry.items.filter((i) => Boolean(i.term)).length} PDF(s)</td>
                        <td className="px-4 py-4 font-medium tabular-nums">{money(entry.items.reduce((sum, i) => sum + (Number(i.value) || 0) * (Number(i.quantity) || 1), 0))}</td>
                        <td className="px-4 py-4 font-semibold tabular-nums">
                          {entry.items.reduce(
                            (sum, i) =>
                              sum + Math.max(0, Number(i.quantity) || 0),
                            0,
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="flex flex-wrap gap-1">{statuses.map((status) => { const count = entry.items.filter((i) => i.status === status).length; return count ? <Badge key={status} className={status === "Guardado" ? "bg-violet-100 text-violet-800 hover:bg-violet-100" : status === "Em Uso" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>{status}: {count}</Badge> : null; })}</div>
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
                            className={`transition-colors hover:bg-slate-50/80 ${entry.parentKey ? "bg-slate-50/60" : ""}`}
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
                                className="h-4 w-4 rounded border-slate-300 accent-teal-700"
                              />
                            </td>
                            <td className={`px-4 py-4 ${entry.parentKey ? "border-l-4 border-l-slate-200 pl-7" : ""}`}>
                              <div className="flex items-center gap-3">
                                {item.image ? (
                                  <img
                                    src={assetUrl(item.image)}
                                    alt=""
                                    className="h-16 w-16 rounded-lg border object-cover"
                                  />
                                ) : (
                                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-slate-50 text-slate-400">
                                    <HardDrive className="h-5 w-5" />
                                  </div>
                                )}
                                <div>
                                  <p
                                    className="max-w-[230px] truncate font-semibold text-slate-800"
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
                                    <p className="mt-1 inline-flex rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
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
                                  <p className="text-xs text-slate-500">
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
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                                {item.department}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.responsavel || (
                                <span className="text-slate-400">
                                  Não atribuído
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                {item.term ? (
                                  <a
                                    href={assetUrl(item.term)}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Abrir PDF"
                                    className="flex h-8 w-8 items-center justify-center rounded-md border text-red-600 hover:bg-red-50"
                                  >
                                    <FileText className="h-4 w-4" />
                                  </a>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => openGenerate(item)}
                                  >
                                    <FilePlus2 className="h-3.5 w-3.5" /> Gerar
                                    termo
                                  </Button>
                                )}
                                {item.image && (
                                  <a
                                    href={assetUrl(item.image)}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Abrir imagem"
                                    className="flex h-8 w-8 items-center justify-center rounded-md border text-blue-600 hover:bg-blue-50"
                                  >
                                    <ImageIcon className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 font-medium tabular-nums">
                              {money(item.value)}
                            </td>
                            <td className="px-4 py-4 tabular-nums">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-4">
                              <Select
                                value={item.status}
                                onValueChange={(v) =>
                                  void updateStatus(item, v)
                                }
                              >
                                <SelectTrigger className="h-8 w-[142px] border-0 bg-transparent px-2 shadow-none focus:ring-1">
                                  <Badge
                                    variant="secondary"
                                    className={item.status === "Guardado" ? "bg-violet-100 text-violet-800 hover:bg-violet-100" : item.status === "Em Uso" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}
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
                                  title="Duplicar registro"
                                  onClick={() => {
                                    openEdit(item);
                                    setEditing(null);
                                    setForm({
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
                                  }}
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
                                  <Trash2 className="h-4 w-4 text-red-600" />
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
          <div className="flex flex-col gap-2 border-t bg-white px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Exibindo {filtered.length} de {items.length} registros
            </span>
            <span>
              Os arquivos são armazenados no servidor; o banco mantém apenas os
              caminhos.
            </span>
          </div>
        </Card>
        <div className="flex items-center justify-between rounded-xl border border-dashed bg-white/60 px-4 py-3 text-xs text-muted-foreground">
          <span>EquipControl · Inventário de equipamentos</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> API REST ·
            MariaDB
          </span>
        </div>
      </main>
      <footer className="border-t bg-white px-4 py-5 text-center text-xs text-slate-500">
        OTMG · Todos os direitos reservados · Desenvolvido por{" "}
        <a
          className="font-medium text-primary underline"
          href="https://www.linkedin.com/in/clara-gon%C3%A7alves-ribeiro-66b07a213/"
          target="_blank"
          rel="noreferrer"
        >
          Clara Ribeiro
        </a>
      </footer>
      {undoItems.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Registro excluído.</span>
          <Button size="sm" variant="outline" onClick={() => void undoDelete()}>
            Desfazer
          </Button>
          <button aria-label="Fechar" onClick={() => setUndoItems([])}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <div>
            <DialogTitle className="text-xl font-bold">
              {editing ? "Editar equipamento" : "Novo equipamento"}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Preencha os dados do item. O responsável é obrigatório quando
              houver termo anexado.
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
                        <SelectItem key={project} value={project} textValue={project}>
                          <span className="block max-w-[220px] truncate" title={project}>{project}</span>
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
              <Field
                label="Responsável"
                required={Boolean(form.term || termFile)}
              >
                <Input
                  value={form.responsavel}
                  onChange={(e) => setField("responsavel", e.target.value)}
                  placeholder="Nome do responsável"
                  required={Boolean(form.term || termFile)}
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
                  className="h-auto py-2"
                  onChange={(e) => setTermFile(e.target.files?.[0] || null)}
                />
              </Field>
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
              <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
                {form.term && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-5 w-5 text-red-600" />
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
                      <button type="button" className="mt-2 block text-xs font-medium text-red-600 underline" onClick={() => { if (window.confirm("Deseja remover o PDF deste equipamento?")) { setField("term", ""); notify("PDF removido do formulário. Salve em até 3 segundos para confirmar a alteração."); } }}>Remover PDF</button>
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
                      <button type="button" className="mt-2 block text-xs font-medium text-red-600 underline" onClick={() => { if (window.confirm("Deseja remover a imagem deste equipamento?")) { setField("image", ""); notify("Imagem removida do formulário. Salve em até 3 segundos para confirmar a alteração."); } }}>Remover imagem</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {termFile && (
              <p className="text-xs text-muted-foreground">
                PDF selecionado: {termFile.name}
              </p>
            )}
            {imageFile && (
              <p className="text-xs text-muted-foreground">
                Imagem selecionada: {imageFile.name}
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
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-lg">Excluir equipamento(s)?</DialogTitle>
          <DialogDescription>
            Esta ação remove os registros selecionados e seus arquivos
            associados. Você poderá desfazer em até 3 segundos.
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteSelected()}
              disabled={saving}
              className="text-white"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Excluir{" "}
              {selected.length > 1 ? `${selected.length} itens` : "equipamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(termItem)}
        onOpenChange={(open) => {
          if (!open) setTermItem(null);
        }}
      >
        <DialogContent>
          <div>
            <DialogTitle className="text-xl font-bold">
              Gerar termo de responsabilidade
            </DialogTitle>
            <DialogDescription className="mt-1">
              Todos os campos abaixo são obrigatórios. O PDF gerado será anexado
              ao equipamento: {termItem?.name}.
            </DialogDescription>
          </div>
          <form onSubmit={generateTerm} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {termFields.map(([key, label, type]) => (
                <Field key={key} label={label} required>
                  <Input
                    type={type}
                    required
                    value={termValues[key]}
                    onChange={(e) => setTermField(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              O termo gerado usa um modelo predefinido como base. Confira os
              dados e o documento antes de coletar assinaturas.
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTermItem(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={generating}>
                {generating && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                <FilePlus2 className="h-4 w-4" /> Gerar PDF
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Toast message={toast} onClose={() => { setToast(""); setUndoAssets([]); }} onUndo={undoAssets.length ? () => { void (async () => { try { const byId = new Map<string, Equipment>(); for (const entry of undoAssets) { const current = byId.get(entry.item.id) || entry.item; byId.set(entry.item.id, { ...current, [entry.field]: entry.value }); } for (const item of byId.values()) await api(`/api/equipments/${encodeURIComponent(item.id)}`, { method: "PUT", body: JSON.stringify(item) }); setUndoAssets([]); await load(); notify("Remoção desfeita."); } catch (e) { notify(`Não foi possível desfazer: ${(e as Error).message}`); } })(); } : undefined} />
    </div>
  );
}
export default App;