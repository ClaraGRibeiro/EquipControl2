# Armazenamento de PDFs e imagens

O EquipControl armazena PDFs de termos e imagens em arquivos no servidor, nas pastas:

- `uploads/terms/`: PDFs dos termos de compromisso.
- `uploads/images/`: imagens dos equipamentos.

O MariaDB guarda somente o caminho de cada arquivo em `equipments.term` e `equipments.image`. As colunas podem continuar como `LONGTEXT`; não é necessário recriar a tabela.

## Configuração do banco

O banco padrão é `equip_control`. Se necessário, defina `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `DB_PORT` como variáveis de ambiente.

## Instalação/execução

Na pasta do projeto, execute:

```bash
npm install
npm start
```

## Migração de dados existentes

Ao consultar `GET /api/equipments`, o servidor migra automaticamente termos e imagens antigos que estejam guardados como Data URLs/Base64 no banco para arquivos nessas pastas, atualizando as colunas com os caminhos correspondentes. Faça backup do banco antes da primeira execução com a nova versão.

## Backups e implantação

Faça backup tanto do MariaDB quanto das pastas `uploads/terms/` e `uploads/images/`. Se executar o Node.js em Docker, monte `uploads/` como volume persistente; caso contrário, os arquivos podem ser perdidos ao remover o container.

## Regra do responsável

Ao anexar ou manter um PDF de termo, o campo `responsavel` precisa conter o nome do responsável. Essa regra é validada no front-end e no back-end.
