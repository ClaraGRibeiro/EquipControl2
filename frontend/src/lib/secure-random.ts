// crypto.randomUUID só existe em contexto seguro: https ou localhost. Abrindo o
// app por http://192.168.x.x (celular na rede local) a propriedade chega
// undefined e o cadastro quebrava com "crypto.randomUUID is not a function".
// getRandomValues continua disponível em contexto inseguro, então o UUID v4 é
// montado a partir dele. Instalado por frontend/src/lib/id.ts antes de gerar id.
export function ensureRandomUuid() {
  // Tipo próprio para não brigar com a tipagem do DOM, que só declara
  // randomUUID quando o contexto é seguro.
  const c = globalThis.crypto as unknown as {
    randomUUID?: () => string;
    getRandomValues?: (buffer: Uint8Array) => Uint8Array;
  };

  if (!c || typeof c.randomUUID === "function") return false;
  if (typeof c.getRandomValues !== "function") return false;

  // Guardado já com o receiver preso: chamar getRandomValues solto (this perdido)
  // dá "Illegal invocation" no navegador, que exige um Crypto de verdade.
  const getRandomValues = c.getRandomValues.bind(c);

  const hex = (bytes: number) => {
    const buffer = new Uint8Array(bytes);
    getRandomValues(buffer);
    return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  };

  const uuidV4 = () => {
    const h = hex(16);

    // Versão 4 no grupo do meio e variant 8..b no seguinte; os 8 primeiros
    // caracteres, que são os usados no id do equipamento, ficam intactos.
    return [
      h.slice(0, 8),
      h.slice(8, 12),
      `4${h.slice(13, 16)}`,
      `8${h.slice(17, 20)}`,
      h.slice(20, 32),
    ].join("-");
  };

  try {
    c.randomUUID = uuidV4;
    return true;
  } catch {
    // Crypto congelado pelo navegador: sem como corrigir aqui.
    return false;
  }
}
