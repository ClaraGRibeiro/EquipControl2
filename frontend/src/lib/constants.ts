import type { FormValues, TermValues } from "./types";


export const emptyForm: FormValues = {
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
export const emptyTerm: TermValues = {
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
export const departments = ["hardware", "software", "imobiliário"];
export const statuses = ["Guardado", "Em Uso", "Manutenção"];
// Cor do selo de status, usada na tabela, na linha do grupo e no detalhe do registro.
export const statusBadgeClass = (status: string) =>
  status === "Guardado"
    ? "bg-violet-100 text-violet-800 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/15"
    : status === "Em Uso"
      ? "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/15"
      : "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15";
export const termFields: [keyof TermValues, string, string][] = [
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
