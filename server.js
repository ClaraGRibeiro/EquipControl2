const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsRoot = path.join(__dirname, 'uploads');
const termsDir = path.join(uploadsRoot, 'terms');
const imagesDir = path.join(uploadsRoot, 'images');
fs.mkdirSync(termsDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

app.use(cors());
// Compatibilidade com bancos existentes: adiciona a coluna de projeto sem apagar dados.
db.query("ALTER TABLE equipments ADD COLUMN project VARCHAR(255) NULL", (err) => { if (err && !/Duplicate column/i.test(err.message)) console.error('Migração da coluna project:', err.message); });
// Os arquivos são enviados como Data URLs pelo front-end; limite mantido para compatibilidade.
app.use(express.json({ limit: '50mb' }));
app.use('/uploads/terms', express.static(termsDir, { fallthrough: false, maxAge: '1d' }));
app.use('/uploads/images', express.static(imagesDir, { fallthrough: false, maxAge: '1d' }));
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  app.use(express.static(__dirname));
}

function saveDataUrl(data, kind) {
  if (!data) return Promise.resolve('');
  const prefix = `/uploads/${kind}/`;
  if (typeof data === 'string' && data.startsWith(prefix)) return Promise.resolve(data);
  if (typeof data !== 'string') return Promise.reject(new Error(`Arquivo de ${kind === 'terms' ? 'termo' : 'imagem'} inválido.`));

  let mime;
  let base64;
  if (kind === 'terms') {
    const match = data.match(/^data:application\/pdf;base64,([A-Za-z0-9+/=\r\n]+)$/i);
    if (!match) return Promise.reject(new Error('O termo deve ser um PDF válido.'));
    mime = 'application/pdf';
    base64 = match[1];
  } else {
    const match = data.match(/^data:(image\/(?:jpeg|png|webp|gif|bmp|avif));base64,([A-Za-z0-9+/=\r\n]+)$/i);
    if (!match) return Promise.reject(new Error('A imagem deve estar em PNG, JPG, WEBP, GIF, BMP ou AVIF.'));
    mime = match[1].toLowerCase();
    base64 = match[2];
  }

  const buffer = Buffer.from(base64.replace(/\s/g, ''), 'base64');
  if (!buffer.length) return Promise.reject(new Error('O arquivo enviado está vazio.'));
  if (kind === 'terms' && buffer.subarray(0, 5).toString() !== '%PDF-') {
    return Promise.reject(new Error('O conteúdo enviado não parece ser um PDF válido.'));
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
  const dir = kind === 'terms' ? termsDir : imagesDir;
  return fs.promises.writeFile(path.join(dir, filename), buffer)
    .then(() => `${prefix}${filename}`);
}

function removeAssetFile(assetPath, kind) {
  const prefix = `/uploads/${kind}/`;
  if (typeof assetPath !== 'string' || !assetPath.startsWith(prefix)) return;
  const filename = path.basename(assetPath);
  const dir = kind === 'terms' ? termsDir : imagesDir;
  fs.promises.unlink(path.join(dir, filename)).catch(() => {});
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => err ? reject(err) : resolve(result));
  });
}

async function migrateLegacyAssets(item) {
  let changed = false;
  if (typeof item.term === 'string' && item.term.startsWith('data:application/pdf;base64,')) {
    item.term = await saveDataUrl(item.term, 'terms');
    await query('UPDATE equipments SET term = ? WHERE id = ?', [item.term, item.id]);
    changed = true;
  }
  if (typeof item.image === 'string' && item.image.startsWith('data:image/')) {
    item.image = await saveDataUrl(item.image, 'images');
    await query('UPDATE equipments SET image = ? WHERE id = ?', [item.image, item.id]);
    changed = true;
  }
  return changed;
}

// Listar equipamentos e migrar arquivos antigos em Base64 quando encontrados.
app.get('/api/equipments', async (req, res) => {
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
    if (Boolean(String(responsavel).trim()) !== Boolean(term)) return res.status(400).json({ error: 'Responsável e termo de compromisso devem ser informados juntos.' });
    termPath = await saveDataUrl(term, 'terms');
    imagePath = await saveDataUrl(image, 'images');
    await query(
      `INSERT INTO equipments (id, name, department, value, quantity, status, patrimonio, responsavel, term, image, project)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, department, value, quantity, status, patrimonio, String(responsavel).trim(), termPath, imagePath, project || '']
    );
    res.status(201).json({ message: 'Equipamento salvo com sucesso!' });
  } catch (err) {
    removeAssetFile(termPath, 'terms');
    removeAssetFile(imagePath, 'images');
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
    const rows = await query('SELECT term, image FROM equipments WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Equipamento não encontrado.' });
    const oldTerm = rows[0].term || '';
    const oldImage = rows[0].image || '';
    const body = req.body;
    const term = body.term === undefined ? oldTerm : body.term;
    const image = body.image === undefined ? oldImage : body.image;
    const responsavel = String(body.responsavel || '').trim();
    if (Boolean(responsavel) !== Boolean(term)) return res.status(400).json({ error: 'Responsável e termo de compromisso devem ser informados juntos.' });

    newTermPath = await saveDataUrl(term, 'terms');
    newImagePath = await saveDataUrl(image, 'images');
    const result = await query(
      `UPDATE equipments SET name=?, department=?, value=?, quantity=?, status=?, patrimonio=?, responsavel=?, term=?, image=?, project=? WHERE id=?`,
      [body.name, body.department, body.value ?? 0, body.quantity ?? 1, body.status || 'Guardado', body.patrimonio || '', responsavel, newTermPath, newImagePath, body.project || '', id]
    );
    if (!result.affectedRows && !rows.length) return res.status(404).json({ error: 'Equipamento não encontrado.' });
    if (oldTerm && oldTerm !== newTermPath) removeAssetFile(oldTerm, 'terms');
    if (oldImage && oldImage !== newImagePath) removeAssetFile(oldImage, 'images');
    res.json({ message: 'Equipamento atualizado com sucesso!' });
  } catch (err) {
    if (newTermPath && newTermPath !== req.body.term) removeAssetFile(newTermPath, 'terms');
    if (newImagePath && newImagePath !== req.body.image) removeAssetFile(newImagePath, 'images');
    console.error('Erro ao atualizar equipamento:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar equipamento.' });
  }
});

// Restaura registros excluídos recentemente para permitir desfazer no front-end.
app.post('/api/equipments/restore', async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Nenhum registro para restaurar.' });
  try {
    for (const i of items) await query(
      `INSERT INTO equipments (id,name,department,value,quantity,status,patrimonio,responsavel,term,image,project) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [i.id,i.name,i.department,i.value||0,i.quantity||1,i.status||'Guardado',i.patrimonio||'',i.responsavel||'',i.term||'',i.image||'',i.project||'']
    );
    res.json({ message: 'Registros restaurados.' });
  } catch (err) { res.status(500).json({ error: err.message || 'Falha ao restaurar.' }); }
});

// Excluir equipamentos e seus arquivos associados.
app.delete('/api/equipments', async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'Nenhum ID fornecido.' });
  try {
    const rows = await query('SELECT * FROM equipments WHERE id IN (?)', [ids]);
    await query('DELETE FROM equipments WHERE id IN (?)', [ids]);
    res.json({ message: 'Equipamento(s) removido(s) com sucesso!', items: rows });
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
