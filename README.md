# EquipControl — React + TypeScript + shadcn/ui

Interface migrada para React, TypeScript, Vite, Tailwind CSS e componentes no padrão shadcn/ui. O back-end Express e o banco MariaDB foram mantidos.

## Requisitos
- Node.js 20 ou superior recomendado
- MariaDB acessível na porta 3306
- Banco `equip_control` e tabela `equipments` existentes

## Configurar banco
Por padrão, o `db.js` conecta em `localhost:3306`, usuário `root`, senha `otmg123` e banco `equip_control`. Recomenda-se configurar credenciais por variáveis de ambiente em vez de manter senha no código:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

## Instalação e desenvolvimento
Na raiz do projeto:

```bash
npm install
npm run dev
```

O back-end roda em `http://localhost:3000` e o Vite em `http://localhost:5173`. Abra a URL do Vite durante o desenvolvimento.

## Produção
```bash
npm install
npm run build
npm start
```

Depois do build, acesse `http://localhost:3000`. O Express entrega os arquivos compilados de `frontend/dist` e mantém as rotas `/api` e `/uploads`.

## Recursos da interface
- Listagem, pesquisa e filtros de equipamentos
- Indicadores de total, em uso, guardados e manutenção
- Login de interface (usuário `admin`, senha `otmg123`) e botão Sair
- Cadastro, edição, duplicação e exclusão individual/em lote com opção de desfazer por 3 segundos
- Agrupamento visual de registros com o mesmo nome
- Campo de projeto/fonte do recurso e relatório PDF de custos por projeto (quantidades e custos somados)
- Validação conjunta de responsável e termo de compromisso
- Upload de PDF e imagem com prévia dos arquivos já associados
- Atualização de status via API
- Geração de termo com todos os campos obrigatórios e anexação do PDF
- Exportação da listagem para Excel
- Componentes UI no padrão shadcn/ui (Button, Input, Card, Badge, Dialog e Select)

A coluna `project` é adicionada automaticamente à tabela existente na inicialização, sem apagar os registros atuais. Depois de atualizar o código, execute `npm install` e `npm run build` antes de iniciar em produção, para gerar o front-end atualizado.

**Atenção:** o login solicitado é feito no navegador e não protege diretamente a API; para publicar em rede externa, implemente autenticação no servidor.

## Arquivos e banco
Os PDFs são armazenados em `uploads/terms/` e imagens em `uploads/images/`. O banco guarda apenas os caminhos nos campos `term` e `image`. Faça backup do banco e dessas duas pastas.

## Observações
- O `template.pdf` deve permanecer na raiz do projeto para gerar termos.
- A autenticação anterior era feita apenas no navegador e não protegia as rotas da API; ela não foi portada como se fosse segurança real. Antes de publicar em uma rede acessível, implemente autenticação e autorização no servidor.
- A exportação Excel atual exporta os registros e links dos documentos; não incorpora os binários de PDFs/imagens dentro de um ZIP.

## Campo Projeto / fonte do recurso

O formulário de equipamento inclui o campo **Projeto / fonte do recurso** (por exemplo, FADENOR ou FAPEMIG). O valor é persistido na coluna `equipments.project`, aparece na listagem e na busca, é exportado para Excel e alimenta o relatório PDF de custos por projeto. A API de cadastro, edição e restauração também grava esse campo.

A inicialização de produção (`npm start`) compila o front-end antes de iniciar o servidor, evitando servir um `frontend/dist` antigo sem as alterações mais recentes. Para desenvolvimento, use `npm run dev`.

Se a coluna ainda não existir em outro banco, o servidor tenta adicioná-la automaticamente; no banco informado, ela já existe e não é necessário executar `ALTER TABLE` manualmente.
