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
