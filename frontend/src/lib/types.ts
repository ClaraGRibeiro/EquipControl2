export type Equipment = {
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
// Remoção de termo/imagem feita na edição: o arquivo espera em uploads/.trash pelo trashId.
export type AssetRemoval = {
  item: Equipment;
  field: "term" | "image";
  value: string;
  trashId?: string;
};

export type FormValues = {
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
export type TermValues = {
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
