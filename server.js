const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createAssetStore, isTrashBatchId, sharedAssetKeys } = require('./assets');
const { validateTermResponsavel } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsRoot = path.join(__dirname, 'uploads');
// Os arquivos do registro excluído ficam em uploads/.trash enquanto o desfazer está aberto.
const assets = createAssetStore({ uploadsRoot, trashTtlMs: 15 * 60 * 1000 });
assets.sweepTrash().catch(() => {});

app.use(cors());
// Compatibilidade com bancos existentes: adiciona a coluna de projeto sem apagar dados.
db.query("ALTER TABLE equipments ADD COLUMN project VARCHAR(255) NULL", (err) => { if (err && !/Duplicate column/i.test(err.message)) console.error('Migração da coluna project:', err.message); });
// Os arquivos são enviados como Data URLs pelo front-end; limite mantido para compatibilidade.
app.use(express.json({ limit: '50mb' }));
app.use('/uploads/terms', express.static(assets.dirs.terms, { fallthrough: false, maxAge: '1d' }));
app.use('/uploads/images', express.static(assets.dirs.images, { fallthrough: false, maxAge: '1d' }));
const frontendDist = path.join(__dirname, 'frontend', 'dist');
// O modelo do termo mora na raiz do repositório, então precisa de rota própria:
// com o front-end compilado, o fallback do SPA entregava index.html em /template.pdf
// e o pdf-lib derrubava o termo com "No PDF header found".
app.get('/template.pdf', (req, res) => {
  res.sendFile(path.join(__dirname, 'template.pdf'), (err) => {
    if (!err || res.headersSent) return;
    console.error('Falha ao servir template.pdf:', err.message);
    res.status(404).json({ error: 'Modelo template.pdf não encontrado no servidor.' });
  });
});
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  app.use(express.static(__dirname));
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
  });
}

/**
 * Chaves dos arquivos que ainda são apontados por outro registro.
 * O banco é lido antes de qualquer mudança e `ignoreIds` ficam de fora, porque são
 * justamente os registros que estão sendo apagados ou alterados: um arquivo que só
 * eles usavam pode ir para a lixeira, um arquivo compartilhado continua em uploads/.
 */
async function assetsInUse(ignoreIds) {
  const rows = await query('SELECT id, term, image FROM equipments');
  return sharedAssetKeys(rows, ignoreIds);
}

async function migrateLegacyAssets(item) {
  let changed = false;
  if (typeof item.term === 'string' && item.term.startsWith('data:application/pdf;base64,')) {
    item.term = await assets.saveDataUrl(item.term, 'terms');
    await query('UPDATE equipments SET term = ? WHERE id = ?', [item.term, item.id]);
    changed = true;
  }
  if (typeof item.image === 'string' && item.image.startsWith('data:image/')) {
    item.image = await assets.saveDataUrl(item.image, 'images');
    await query('UPDATE equipments SET image = ? WHERE id = ?', [item.image, item.id]);
    changed = true;
  }
  return changed;
}

// Listar equipamentos e migrar arquivos antigos em Base64 quando encontrados.
app.get('/api/equipments', async (req, res) => {
  // Abas fechadas antes do purge deixam lotes na lixeira; a varredura remove os antigos.
  assets.sweepTrash().catch(() => {});
  try {
    const results = await query('SELECT * FROM equipments ORDER BY created_at DESC');
    for (const item of results) await migrateLegacyAssets(item);
    res.json(results);
  } catch (err) {
    console.error('Erro ao consultar/migrar equipamentos:', err);
    res.status(500).json({ error: `Erro ao consultar equipamentos: ${err.message}` });
  }
});

// Cadastrar equipamento.
app.post('/api/equipments', async (req, res) => {
  const { id, name, department, value = 0, quantity = 1, status = 'Guardado', patrimonio = '', responsavel = '', term = '', image = '', project = '' } = req.body;
  let termPath = '';
  let imagePath = '';
  try {
    if (!id || !name || !department) return res.status(400).json({ error: 'Nome e departamento são obrigatórios.' });
    const termError = validateTermResponsavel({ term, responsavel });
    if (termError) return res.status(400).json({ error: termError });
    termPath = await assets.saveDataUrl(term, 'terms');
    imagePath = await assets.saveDataUrl(image, 'images');
    await query(
      `INSERT INTO equipments (id, name, department, value, quantity, status, patrimonio, responsavel, term, image, project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, department, value, quantity, status, patrimonio, String(responsavel).trim(), termPath, imagePath, project || '']
    );
    res.status(201).json({ message: 'Equipamento salvo com sucesso!' });
  } catch (err) {
    void assets.removeFile(termPath, 'terms');
    void assets.removeFile(imagePath, 'images');
    console.error('Erro ao cadastrar equipamento:', err);
    res.status(500).json({ error: err.message || 'Erro ao cadastrar equipamento.' });
  }
});

// Atualizar equipamento e limpar arquivos substituídos/removidos.
app.put('/api/equipments/:id', async (req, res) => {
  const { id } = req.params;
  let newTermPath = '';
  let newImagePath = '';
  try {
    const rows = await query('SELECT term, image, responsavel FROM equipments WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Equipamento não encontrado.' });
    const oldTerm = rows[0].term || '';
    const oldImage = rows[0].image || '';
    // Lido antes do UPDATE: arquivo que outro registro também usa não sai de uploads/.
    const keep = await assetsInUse([id]);
    const body = req.body;
    const term = body.term === undefined ? oldTerm : body.term;
    const image = body.image === undefined ? oldImage : body.image;
    const responsavel = String(body.responsavel || '').trim();
    const termError = validateTermResponsavel({
      term,
      responsavel,
      previous: { term: oldTerm, responsavel: rows[0].responsavel },
    });
    if (termError) return res.status(400).json({ error: termError });

    newTermPath = await assets.saveDataUrl(term, 'terms');
    newImagePath = await assets.saveDataUrl(image, 'images');
    const result = await query(
      `UPDATE equipments SET name=?, department=?, value=?, quantity=?, status=?, patrimonio=?, responsavel=?, term=?, image=?, project=? WHERE id=?`,
      [body.name, body.department, body.value ?? 0, body.quantity ?? 1, body.status || 'Guardado', body.patrimonio || '', responsavel, newTermPath, newImagePath, body.project || '', id]
    );
    if (!result.affectedRows && !rows.length) return res.status(404).json({ error: 'Equipamento não encontrado.' });
    // O termo/imagem que deixaram de ser usados sai de uploads/ e espera na lixeira
    // para o "Desfazer" do formulário funcionar; a lixeira nunca derruba a edição.
    let trashId = '';
    let trashed = 0;
    let kept = 0;
    try {
      trashId = assets.newTrashBatch();
      const moved = await assets.trashReplacedAssets(
        { id, before: { term: oldTerm, image: oldImage }, after: { term: newTermPath, image: newImagePath } },
        trashId,
        { keep },
      );
      trashId = moved.trashId;
      trashed = moved.trashed;
      kept = moved.kept;
    } catch (trashErr) {
      console.error('Falha ao mover arquivos substituídos para a lixeira:', trashErr);
      trashId = '';
      if (oldTerm && oldTerm !== newTermPath) void assets.removeFile(oldTerm, 'terms', { keep });
      if (oldImage && oldImage !== newImagePath) void assets.removeFile(oldImage, 'images', { keep });
    }
    res.json({ message: 'Equipamento atualizado com sucesso!', trashId, trashed, kept });
  } catch (err) {
    if (newTermPath && newTermPath !== req.body.term) void assets.removeFile(newTermPath, 'terms');
    if (newImagePath && newImagePath !== req.body.image) void assets.removeFile(newImagePath, 'images');
    console.error('Erro ao atualizar equipamento:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar equipamento.' });
  }
});

// Restaura registros excluídos recentemente para permitir desfazer no front-end.
app.post('/api/equipments/restore', async (req, res) => {
  const items = req.body?.items;
  const trashId = req.body?.trashId;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Nenhum registro para restaurar.' });
  if (trashId && !isTrashBatchId(trashId)) return res.status(400).json({ error: 'Identificador de lixeira inválido.' });
  try {
    // Os arquivos voltam de uploads/.trash; caminhos sem arquivo são limpos antes de reinserir.
    let lost = [];
    try {
      lost = await assets.restoreAssets(items, trashId);
    } catch (trashErr) {
      // Falha na lixeira não pode impedir a reinserção das linhas do banco.
      console.error('Falha ao devolver arquivos da lixeira:', trashErr);
      lost = items.flatMap((i) => [i.term, i.image].filter(Boolean).map(() => ({ id: i.id, field: 'arquivo' })));
    }
    for (const i of items) await query(
      `INSERT INTO equipments (id,name,department,value,quantity,status,patrimonio,responsavel,term,image,project) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [i.id,i.name,i.department,i.value||0,i.quantity||1,i.status||'Guardado',i.patrimonio||'',i.responsavel||'',i.term||'',i.image||'',i.project||'']
    );
    // O identificador da lixeira pode sumir: a limpeza é só higiene, o purge manual/varredura resolve.
    try {
      if (trashId) await assets.purgeTrash(trashId);
    } catch (trashErr) {
      console.error('Falha ao limpar a lixeira após o desfazer:', trashErr);
    }
    res.json({
      message: lost.length
        ? `Registros restaurados, mas ${lost.length} arquivo(s) já haviam saído da lixeira.`
        : 'Registros restaurados.',
      items,
      lost,
    });
  } catch (err) { res.status(500).json({ error: err.message || 'Falha ao restaurar.' }); }
});

// Devolve para uploads/ os arquivos que uma edição tirou de lá (desfazer do formulário).
// O banco é ajustado em seguida pelo PUT normal, que continua validando responsável+termo.
app.post('/api/equipments/assets/restore', async (req, res) => {
  const items = req.body?.items;
  const trashId = req.body?.trashId;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Nenhum arquivo para restaurar.' });
  if (!isTrashBatchId(trashId)) return res.status(400).json({ error: 'Identificador de lixeira inválido.' });
  try {
    // Caminhos que já saíram da lixeira vêm em "lost" para o front não regravar link quebrado.
    const lost = await assets.restoreAssets(items, trashId);
    try {
      await assets.purgeTrash(trashId);
    } catch (trashErr) {
      console.error('Falha ao limpar a lixeira após desfazer a remoção:', trashErr);
    }
    res.json({
      message: lost.length ? `${lost.length} arquivo(s) já haviam saído da lixeira.` : 'Arquivos restaurados.',
      lost,
    });
  } catch (err) {
    console.error('Erro ao restaurar arquivos da edição:', err);
    res.status(500).json({ error: err.message || 'Falha ao restaurar arquivos.' });
  }
});

// Apaga em definitivo os arquivos do lote excluído, quando o desfazer expira.
app.post('/api/equipments/trash/purge', async (req, res) => {
  const batches = req.body?.trashIds ?? req.body?.trashId;
  const ids = Array.isArray(batches) ? batches : [batches];
  if (ids.some((id) => id && !isTrashBatchId(id)))
    return res.status(400).json({ error: 'Identificador de lixeira inválido.' });
  try {
    const removed = await assets.purgeTrash(ids);
    res.json({ message: 'Lixeira limpa.', removed });
  } catch (err) {
    console.error('Erro ao limpar lixeira:', err);
    res.status(500).json({ error: err.message || 'Falha ao limpar lixeira.' });
  }
});

// Excluir equipamentos: a linha sai do banco e os arquivos vão para a lixeira.
app.delete('/api/equipments', async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Nenhum ID fornecido.' });
  try {
    const rows = await query('SELECT * FROM equipments WHERE id IN (?)', [ids]);
    // Lido antes do DELETE: arquivo que outro registro continua usando fica em uploads/.
    const keep = await assetsInUse(ids);
    await query('DELETE FROM equipments WHERE id IN (?)', [ids]);
    // O desfazer dura 3 segundos no front; a lixeira segura os arquivos até o purge.
    const trashId = assets.newTrashBatch();
    let trashed = 0;
    let missing = 0;
    let kept = 0;
    try {
      ({ trashed, missing, kept } = await assets.trashAssets(rows, trashId, { keep }));
    } catch (trashErr) {
      // A linha já saiu do banco: preservar o payload do desfazer vale mais que a lixeira.
      console.error('Falha ao mover arquivos para a lixeira:', trashErr);
    }
    res.json({ message: 'Equipamento(s) removido(s) com sucesso!', items: rows, trashId, trashed, missing, kept });
  } catch (err) {
    console.error('Erro ao excluir equipamento(s):', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir equipamento(s).' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  const builtIndex = path.join(__dirname, 'frontend', 'dist', 'index.html');
  if (fs.existsSync(builtIndex)) return res.sendFile(builtIndex);
  return res.status(404).send('Front-end não compilado. Execute npm run build.');
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
