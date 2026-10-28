# EquipControl — Inventário de equipamentos (OTMG)

Sistema de gestão de patrimônio e equipamentos: cadastro, controle de status por unidade, anexos (termo de compromisso em PDF e foto), relatório de custos por projeto e exportação para Excel.

Front-end em **React + TypeScript + Vite + Tailwind** com componentes no padrão **shadcn/ui**. Back-end **Express** e banco **MariaDB** mantidos da versão anterior.

## Stack e arquitetura

| Camada | Implementação |
|---|---|
| Interface | React 18, TypeScript, Vite 6, Tailwind CSS, Radix (shadcn/ui) em `frontend/` |
| API | Express 4 (`server.js`) — rotas `/api/equipments`, estáticos `/uploads/*` e `frontend/dist` |
| Banco | MariaDB/MySQL com `mysql2` (`db.js`) |
| Documentos | Arquivos em `uploads/terms/` e `uploads/images/`; o banco guarda apenas o caminho |
| Geração de PDF | `pdf-lib` no navegador: termo gerado sobre o `template.pdf` e enviado como Data URL |
| Planilha | `xlsx` no navegador |

## Requisitos

- Node.js 20 ou superior
- MariaDB acessível na porta 3306
- Banco `equip_control` e tabela `equipments` criados (schema abaixo)

## Configurar o banco

O `db.js` usa, por padrão, `localhost:3306`, usuário `root`, senha `otmg123` e banco `equip_control`. Prefira sobrescrever por variáveis de ambiente em vez de manter a senha no código (o arquivo `.env` já está no `.gitignore`, mas o código não o carrega — exporte as variáveis no ambiente):

| Variável | Padrão |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `otmg123` |
| `DB_NAME` | `equip_control` |

O projeto **não cria a tabela** e não usa ferramenta de migração. Se a tabela ainda não existir, crie-a:

```sql
CREATE TABLE IF NOT EXISTS equipments (
  id          VARCHAR(50)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  department  VARCHAR(100) NOT NULL,
  value       DECIMAL(10,2) DEFAULT 0,
  quantity    INT DEFAULT 1,
  status      VARCHAR(50) DEFAULT 'Guardado',
  patrimonio  VARCHAR(255),
  responsavel VARCHAR(255),
  term        LONGTEXT,
  image       LONGTEXT,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  project     VARCHAR(255)
);
```

Para popular com a base de exemplo, execute `seed.txt` (13 equipamentos). Ele referencia arquivos já versionados em `uploads/`; confirme que eles existem antes de importar.

A coluna `project` é adicionada automaticamente na inicialização do servidor (`server.js`) quando não existir, sem apagar registros.

### Inserindo registros direto no banco

O site gera o `id` como base 36 do timestamp + 8 caracteres aleatórios (`mvr2csdr-96798e6f`). Para inserir pelo terminal usando o mesmo cálculo, gere o id com o script `scripts/new-id.mjs`:

```bash
npm run new-id                                   # um id
npm run new-id -- --count 3                      # vários ids
npm run new-id -- --sql --name "NOBREAK RAGTECH SENOIDAL NEP 3200VA" \
  --department hardware --value 2100.00 --quantity 1 \
  --project "Observatório Do Transportes Do Estado De Minas Gerais"
```

Com `--sql` o comando imprime o `INSERT` pronto, já com o `id` gerado, os números sem aspas e `created_at` deixado para o `DEFAULT CURRENT_TIMESTAMP`:

```sql
INSERT INTO equipments (id, name, department, value, quantity, status, patrimonio, responsavel, term, image, project)
VALUES ('mvr41brs-2fd7492c', 'NOBREAK RAGTECH SENOIDAL NEP 3200VA', 'hardware', 2100.00, 1, 'Guardado', '', '', '', '', 'Observatório Do Transportes Do Estado De Minas Gerais');
```

Opções aceitas: `--name`, `--department`, `--value`, `--quantity`, `--status`, `--patrimonio`, `--responsavel`, `--term`, `--image` e `--project`. O cálculo fica em `frontend/src/lib/id.ts` e é replicado no script; `tests/equipment-id.test.js` falha se os dois saírem do sincronismo.

Para preencher os ids de um arquivo de seed (só os valores vazios de `id`, o resto do arquivo fica intacto):

```bash
npm run new-id -- --file seed.txt        # mostra o SQL corrigido (dry-run)
npm run new-id -- --file seed.txt --write # aplica no arquivo
```

O script lê o `INSERT` respeitando vírgulas e parênteses dentro do texto (as descrições dos equipamentos são cheias disso), avisa a linha quando falta uma `,` entre os blocos `VALUES (...)`, mantém os ids que já estão preenchidos e troca `created_at` vazio (`''`) por `CURRENT_TIMESTAMP`, porque `''` é recusado pelo MySQL/MariaDB.

Cada execução gera ids novos, então rodar o seed mais de uma vez cria equipamentos duplicados.

## Instalação e desenvolvimento

```bash
npm install
npm run dev
```

O back-end sobe em `http://localhost:3000` e o Vite em `http://localhost:5173`. **Durante o desenvolvimento, abra a URL do Vite** — o `vite.config.ts` faz proxy de `/api`, `/uploads` e `/template.pdf` para o Express.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Express + Vite em paralelo (concurrently) |
| `npm run server:dev` | Apenas o Express |
| `npm run client:dev` | Apenas o Vite |
| `npm run build` | Compila o front-end em `frontend/dist` |
| `npm start` | Executa o build e inicia o Express |
| `npm test` | Testes de `assets.js` e do gerador de id com o runner nativo do Node (`node --test`) |
| `npm run new-id` | Gera id no formato do site: `--sql` monta o `INSERT`, `--file seed.txt` preenche os ids vazios de um seed |

## Produção

```bash
npm install
npm run build
npm start
```

Depois do build, acesse `http://localhost:3000`: o Express entrega os arquivos de `frontend/dist` e mantém as rotas `/api` e `/uploads`. Como `npm start` já roda o build antes de subir, não fica um `frontend/dist` antigo servindo código velho.

## API

| Método | Rota | Observações |
|---|---|---|
| `GET` | `/api/equipments` | Retorna todos os registros e migra automaticamente termos/imagens antigos salvos como Base64 para arquivos em disco |
| `POST` | `/api/equipments` | Cria. Exige `id`, `name`, `department`; `responsavel` e `term` precisam vir juntos |
| `PUT` | `/api/equipments/:id` | Atualiza. Campos `term`/`image` ausentes no corpo mantêm o valor atual; o anexo que deixou de ser usado sai de `uploads/` e espera em `uploads/.trash/<trashId>/`, e a resposta devolve o `trashId` (vazio quando nenhum anexo mudou) |
| `POST` | `/api/equipments/assets/restore` | Devolve para `uploads/` os arquivos que uma edição tirou de lá (desfazer do formulário). Corpo `{ "items": [{ "id", "term", "image" }], "trashId": "..." }`; o que já foi purgado vem em `lost` para o front não regravar link quebrado |
| `POST` | `/api/equipments/restore` | Reinsere registros excluídos (usado pelo "Desfazer"). Corpo `{ "items": [...], "trashId": "..." }`: se enviado, os arquivos voltam da lixeira; caminhos sem arquivo são limpos antes de reinserir |
| `POST` | `/api/equipments/trash/purge` | Apaga em definitivo os arquivos do lote informado. Corpo `{ "trashId": "..." }` (ou `trashIds: [...]`). Chamado pela interface quando o desfazer expira |
| `DELETE` | `/api/equipments` | Corpo `{ "ids": [...] }`. Remove as linhas do banco, move os PDFs/imagens para `uploads/.trash/<trashId>/` e devolve `{ items, trashId, trashed, missing }` |
| `GET` | `/uploads/terms/*`, `/uploads/images/*` | Arquivos estáticos |
| `GET` | `/template.pdf` | Modelo usado na geração do termo |

O `id` é gerado no front-end (`base36 do timestamp + sufixo aleatório`) quando não informado.

### Ciclo de vida dos arquivos excluídos

1. `DELETE` move os arquivos para `uploads/.trash/<trashId>/` (o `trashId` é um UUID devolvido na resposta).
2. Se o usuário clicar em **Desfazer** dentro dos 3 segundos, `POST /api/equipments/restore` devolve os arquivos para `uploads/terms|images/`.
3. Quando o desfazer expira (ou o card é fechado), a interface chama `POST /api/equipments/trash/purge` e os arquivos somem do disco.
4. Se a aba for fechada antes disso, a varredura automática remove os lotes com mais de 15 minutos na abertura da listagem e na inicialização do servidor.

A edição de um equipamento usa o mesmo depósito: quando o `PUT` grava um PDF/imagem novo (ou nenhum), o arquivo que deixou de ser usado é movido para `uploads/.trash/<trashId>/` pelo `trashReplacedAssets` de `assets.js` e o `trashId` volta na resposta. O **Desfazer** do formulário chama `POST /api/equipments/assets/restore` para trazer o arquivo de volta e depois o `PUT` devolve o caminho ao banco; expirado o prazo, a interface chama o purge. A comparação é pelo nome do arquivo, então reenviar o mesmo anexo (com ou sem barra inicial) não tira nada do lugar.

Os arquivos nunca são servidos pela rota `/uploads/*`: o Express publica apenas `uploads/terms` e `uploads/images`.

## Funcionalidades

- Listagem com busca por nome, patrimônio, responsável e projeto
- Filtros de departamento (`hardware`, `software`, `imobiliário`), status e projeto, com paginação de 10/50/100 registros
- Indicadores de total, em uso, guardados e em manutenção
- Cadastro, edição, duplicação e exclusão individual ou em lote, com **desfazer por 3 segundos** (restauração via API)
- Remover o PDF ou a imagem no formulário tira o arquivo de `uploads/` na hora, com **desfazer por 3 segundos** que devolve o arquivo e o caminho gravado
- Cadastro duplicado: se todos os atributos coincidirem com um registro existente, a quantidade é aumentada em 1 em vez de criar um novo registro
- Ajuste rápido de quantidade (+/−); reduzir de 1 para 0 pede confirmação de exclusão
- Alteração de status individual ou em lote
- Agrupamento expandível de registros com o mesmo nome
- Campo **Projeto / fonte do recurso** (ex.: FADENOR, FAPEMIG): persistido em `equipments.project`, aparece na listagem e na busca, é filtrável, vai para o Excel e alimenta o relatório PDF
- **Termo de responsabilidade**: formulário com 11 campos obrigatórios, gera o PDF sobre o `template.pdf` e anexa ao equipamento
- Upload de PDF e imagem com prévia dos arquivos já associados e desfazer da remoção por 3 segundos
- **Relatório PDF do inventário** (`inventario-<projeto>-<aaaa-mm-dd>.pdf`) por projeto ou para todos: A4 paisagem, tabela paginada com cabeçalho repetido em cada página, colunas Equipamento, Patrimônio, Responsável, Projeto / fonte, Valor unit., Qtd. e Status, resumo com contagem de registros/unidades e total investido na última página
- **Exportação para Excel** por projeto ou para todos (os documentos entram como link, não como anexo binário)
- **Logo** em `frontend/public/logo.png`: usado como ícone do site (favicon) e como marca d'água do relatório PDF (alfa `WATERMARK_OPACITY`, hoje `0.1`, desenhado antes de todo o resto em cada página); se o arquivo faltar, o relatório é gerado sem marca
- Layout responsivo: no celular, as ações ficam em um menu e há botão flutuante de novo equipamento
- **Tema claro/escuro**: botão Sol/Lua no cabeçalho (e no menu do celular). A escolha fica em `localStorage` com a chave `equipcontrol-theme`; sem escolha salva, o app segue o `prefers-color-scheme` do sistema. O `index.html` aplica a classe `.dark` no `<html>` antes da primeira pintura (não pisca o tema claro) e os tokens HSL de `frontend/src/index.css` trocam juntos — cores fixas dos componentes usam variante `dark:`

## Acesso

O login (`admin` / `otmg123`) é validado **no navegador** e guardado em `localStorage`.

> **Atenção:** esse login não protege a API. Nenhuma rota `/api` exige autenticação, o `cors()` está aberto e o limite de corpo é de 50 MB. Antes de publicar em uma rede acessível, implemente autenticação e autorização no servidor.

## Arquivos e backup

- Termos em `uploads/terms/`, imagens em `uploads/images/`
- `uploads/.trash/` é a lixeira temporária da exclusão; ela é ignorada pelo git e pode ser esvaziada manualmente
- O banco guarda somente os caminhos nas colunas `term` e `image` (podem continuar `LONGTEXT`)
- Faça backup do banco **e** dessas duas pastas. Em Docker, monte `uploads/` como volume persistente
- O `template.pdf` deve permanecer na raiz para a geração de termos
- Detalhes em [ARQUIVOS-PDF.md](ARQUIVOS-PDF.md)

## Estrutura

```
.
├── server.js              # API Express, uploads e estáticos
├── assets.js              # Depósito de arquivos: salvar, lixeira, restaurar, purge
├── db.js                  # Conexão MariaDB (mysql2)
├── seed.txt               # Dados de exemplo
├── template.pdf           # Modelo do termo de responsabilidade
├── scripts/new-id.mjs     # Gera ids no formato do site para inserir pelo terminal
├── tests/                 # Testes (node --test): depósito de arquivos, ids, relatório PDF
├── uploads/terms|images/  # Arquivos enviados
└── frontend/
    ├── index.html         # Favicon, script do tema antes da pintura e o div#root montado pelo main.tsx
    ├── public/logo.png    # Logo: ícone do site e marca d'água do relatório
    ├── vite.config.ts
    └── src/
        ├── App.tsx        # Composição da tela: login, cabeçalho, tabelas e diálogos
        ├── components/    # inventory/, dialogs/, ui/, login e rodapé
        ├── hooks/         # use-inventory (composer) + crud, termo, exportações, view
        └── lib/           # api, filtros, ids, Excel, termo e relatório PDF
```

## Limitações conhecidas

- Autenticação apenas no navegador; a API fica aberta (ver aviso acima)
- Sem lint e sem CI; os testes cobrem `assets.js` (salvar/lixeira/restaurar/purge), geração de id, formatação de texto, tema e o gerador do relatório PDF
- `components/inventory/inventory-table.tsx` ainda reúne linha de agrupamento, linhas filhas, seleção, ajuste de quantidade e ações da linha
- Atualização de status em lote dispara uma requisição `PUT` por registro; não há endpoint de lote
- A listagem não é paginada no servidor (`SELECT *`); toda filtragem é feita no navegador
- `db.js` usa conexão única, sem pool nem reconexão: suba o MariaDB antes do Node
- O bundle de produção passa de 1 MB porque `xlsx` e `pdf-lib` são carregados estaticamente
- A dependência `zod` está instalada, mas não é utilizada
