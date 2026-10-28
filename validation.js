// Regra de negócio do par responsável × termo de responsabilidade.
//
// Termo exige responsável. Responsável sozinho é permitido: o PDF pode ser gerado
// depois, pelo botão Gerar termo da linha da tabela.
//
// `previous` (termo/responsável que estão salvos no registro) existe por causa do
// legado: há registros com PDF anexado e responsável vazio. Sem essa exceção,
// qualquer edição desses registros — até trocar o status na tabela — seria recusada.
// A exceção só vale enquanto o termo é o MESMO arquivo já salvo no banco.
const TERM_WITHOUT_RESPONSABLE =
  'Todo termo de responsabilidade precisa de um responsável.';

function validateTermResponsavel({ term, responsavel, previous }) {
  const hasTerm = Boolean(String(term || '').trim());
  const hasResponsable = Boolean(String(responsavel || '').trim());
  if (!hasTerm || hasResponsable) return '';

  const keptLegacyTerm =
    Boolean(previous) &&
    String(previous.term || '') === String(term || '') &&
    !String(previous.responsavel || '').trim();

  return keptLegacyTerm ? '' : TERM_WITHOUT_RESPONSABLE;
}

module.exports = { validateTermResponsavel, TERM_WITHOUT_RESPONSABLE };
