import { ensureRandomUuid } from "./secure-random";

// Id do equipamento no formato usado pelo cadastro em tela (base 36 do timestamp
// + 8 caracteres aleatórios). O script `scripts/new-id.mjs` replica este mesmo
// cálculo para quem insere registros direto no MySQL; os testes em
// `tests/equipment-id.test.js` garantem que os dois continuem iguais.
//
// ensureRandomUuid cria crypto.randomUUID quando o app roda em http por IP de
// rede (acesso pelo celular), caso contrário a linha abaixo quebra.
ensureRandomUuid();

export const newEquipmentId = () =>
  `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
