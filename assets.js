const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Pastas de uploads e o campo do equipamento que guarda o caminho de cada uma.
const KINDS = ['terms', 'images'];
const ASSET_FIELDS = [
  { kind: 'terms', field: 'term' },
  { kind: 'images', field: 'image' },
];
const PUBLIC_PREFIX = { terms: '/uploads/terms/', images: '/uploads/images/' };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function exists(target) {
  return fs.promises.access(target).then(() => true, () => false);
}

/** O identificador da lixeira é sempre um UUID; qualquer outro valor é rejeitado. */
function isTrashBatchId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Depósito de arquivos de equipamentos.
 * Os arquivos ativos ficam em uploads/<kind>/ e os excluídos aguardam em
 * uploads/.trash/<trashId>/<kind>/ até o desfazer expirar e o purge apagar.
 */
function createAssetStore({ uploadsRoot, trashTtlMs = 15 * 60 * 1000 }) {
  const dirs = {
    terms: path.join(uploadsRoot, 'terms'),
    images: path.join(uploadsRoot, 'images'),
  };
  const trashRoot = path.join(uploadsRoot, '.trash');
  for (const dir of [dirs.terms, dirs.images, trashRoot]) fs.mkdirSync(dir, { recursive: true });

  function kindDir(kind) {
    if (!KINDS.includes(kind)) throw new Error(`Tipo de arquivo desconhecido: ${kind}.`);
    return dirs[kind];
  }

  /**
   * Resolve o caminho físico de um valor gravado nas colunas term/image.
   * Aceita o formato atual (/uploads/terms/x.pdf) e o do seed (uploads/terms/x.pdf).
   * Sempre usa apenas o nome do arquivo, o que impede escapar da pasta.
   */
  function localPath(assetPath, kind) {
    if (typeof assetPath !== 'string') return null;
    const filename = path.basename(assetPath.trim());
    if (!filename || filename === '.' || filename === '..') return null;
    return path.join(kindDir(kind), filename);
  }

  function isStoredPath(data, kind) {
    const value = String(data).trim();
    const prefix = `uploads/${kind}/`;
    return value.startsWith(prefix) || value.startsWith(`/${prefix}`);
  }

  /** Salva o Data URL recebido e devolve o caminho público. Caminhos já gravados são mantidos. */
  async function saveDataUrl(data, kind) {
    if (!data) return '';
    kindDir(kind);
    if (isStoredPath(data, kind)) return data;
    if (typeof data !== 'string') {
      throw new Error(`Arquivo de ${kind === 'terms' ? 'termo' : 'imagem'} inválido.`);
    }

    let mime;
    let base64;
    if (kind === 'terms') {
      const match = data.match(/^data:application\/pdf;base64,([A-Za-z0-9+/=\r\n]+)$/i);
      if (!match) throw new Error('O termo deve ser um PDF válido.');
      mime = 'application/pdf';
      base64 = match[1];
    } else {
      const match = data.match(/^data:(image\/(?:jpeg|png|webp|gif|bmp|avif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
      if (!match) throw new Error('A imagem deve estar em PNG, JPG, WEBP, GIF, BMP ou AVIF.');
      mime = match[1].toLowerCase();
      base64 = match[2];
    }

    const buffer = Buffer.from(base64.replace(/\s/g, ''), 'base64');
    if (!buffer.length) throw new Error('O arquivo enviado está vazio.');
    if (kind === 'terms' && buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('O conteúdo enviado não parece ser um PDF válido.');
    }

    const extensionByMime = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/avif': 'avif',
    };
    const filename = `${crypto.randomUUID()}.${extensionByMime[mime]}`;
    await fs.promises.writeFile(path.join(kindDir(kind), filename), buffer);
    return `${PUBLIC_PREFIX[kind]}${filename}`;
  }

  /** Apaga o arquivo em definitivo. Usado quando o arquivo antigo foi substituído. */
  async function removeFile(assetPath, kind) {
    const file = localPath(assetPath, kind);
    if (!file) return false;
    return fs.promises.rm(file, { force: true }).then(() => true, () => false);
  }

  function newTrashBatch() {
    return crypto.randomUUID();
  }

  function trashDirFor(trashId) {
    if (!isTrashBatchId(trashId)) {
      throw new Error('Identificador de lixeira inválido.');
    }
    return path.join(trashRoot, trashId);
  }

  /**
   * Move os termos e imagens dos registros excluídos para a lixeira.
   * Retorna quantos arquivos foram movidos e quantos caminhos não tinham arquivo.
   */
  async function trashAssets(items, trashId) {
    const target = trashDirFor(trashId);
    let trashed = 0;
    let missing = 0;
    for (const item of items) {
      for (const { kind, field } of ASSET_FIELDS) {
        const value = item[field] || '';
        if (!value) continue;
        const source = localPath(value, kind);
        if (!source || !(await exists(source))) {
          missing += 1;
          continue;
        }
        const destination = path.join(target, kind, path.basename(source));
        await fs.promises.mkdir(path.dirname(destination), { recursive: true });
        await fs.promises.rename(source, destination);
        trashed += 1;
      }
    }
    return { trashed, missing };
  }

  /**
   * Move para a lixeira o termo/imagem que deixaram de ser usados numa edição.
   * A comparação é pelo arquivo (nome dentro da pasta do tipo), não pela string:
   * o mesmo anexo pode chegar com ou sem barra inicial e não deve sair de uploads/.
   * Sem mudança de arquivo, devolve trashId vazio para o front não mostrar desfazer.
   */
  async function trashReplacedAssets({ id, before, after }, trashId) {
    const nameOf = (value, kind) => {
      const file = localPath(value, kind);
      return file ? path.basename(file) : '';
    };
    const picked = { id };
    for (const { kind, field } of ASSET_FIELDS) {
      const oldName = nameOf(before[field] || '', kind);
      if (!oldName) continue;
      if (nameOf(after[field] || '', kind) === oldName) continue;
      picked[field] = before[field];
    }
    if (!picked.term && !picked.image) return { trashId: '', trashed: 0, missing: 0 };
    const { trashed, missing } = await trashAssets([picked], trashId);
    return { trashId, trashed, missing };
  }

  /**
   * Devolve os arquivos da lixeira para uploads/<kind>/.
   * Caminhos que não têm arquivo nem na lixeira nem na pasta ativa têm o valor
   * limpo no próprio item recebido, para o banco não guardar link quebrado.
   */
  async function restoreAssets(items, trashId) {
    const lost = [];
    if (!trashId) return lost;
    const source = trashDirFor(trashId);
    for (const item of items) {
      for (const { kind, field } of ASSET_FIELDS) {
        const value = item[field] || '';
        if (!value) continue;
        const live = localPath(value, kind);
        if (!live) continue;
        const trashedFile = path.join(source, kind, path.basename(live));
        if (await exists(trashedFile)) {
          await fs.promises.mkdir(path.dirname(live), { recursive: true });
          await fs.promises.rename(trashedFile, live);
        } else if (!(await exists(live))) {
          lost.push({ id: item.id, field });
          item[field] = '';
        }
      }
    }
    return lost;
  }

  /** Remove a lixeira dos lotes informados. Chamar quando o desfazer expira. */
  async function purgeTrash(trashIds) {
    const list = Array.isArray(trashIds) ? trashIds : [trashIds];
    let removed = 0;
    for (const trashId of list) {
      if (!trashId) continue;
      await fs.promises.rm(trashDirFor(trashId), { recursive: true, force: true });
      removed += 1;
    }
    return removed;
  }

  /** Limpa lotes antigos, de abas fechadas antes do purge do front-end. */
  async function sweepTrash(now = Date.now()) {
    let entries = [];
    try {
      entries = await fs.promises.readdir(trashRoot);
    } catch {
      return 0;
    }
    let removed = 0;
    for (const entry of entries) {
      const dir = path.join(trashRoot, entry);
      let info;
      try {
        info = await fs.promises.stat(dir);
      } catch {
        continue;
      }
      if (!info.isDirectory() || now - info.mtimeMs <= trashTtlMs) continue;
      await fs.promises.rm(dir, { recursive: true, force: true });
      removed += 1;
    }
    return removed;
  }

  return {
    KINDS,
    dirs,
    trashRoot,
    localPath,
    saveDataUrl,
    removeFile,
    newTrashBatch,
    trashAssets,
    trashReplacedAssets,
    restoreAssets,
    purgeTrash,
    sweepTrash,
  };
}

module.exports = { createAssetStore, isTrashBatchId, KINDS, PUBLIC_PREFIX };
