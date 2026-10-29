import type { Equipment } from "./types";

// Imagem que já está em uploads/images e pode ser reaproveitada por outro registro.
export type ExistingImage = {
  // caminho como a API devolve, é o que vai no form.image (nada é enviado de novo)
  path: string;
  // nome do arquivo dentro de uploads/images
  filename: string;
  // quantos registros apontam para esse arquivo
  count: number;
  // nomes dos equipamentos que usam o arquivo (rótulo da miniatura)
  owners: string[];
};

// Aceita o formato atual (/uploads/images/x.jpg) e o do seed (uploads/images/x.jpg).
const STORED_IMAGE = /^\/?uploads\/images\//i;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

const fileName = (value: string) => {
  const index = value.lastIndexOf("/");
  return index >= 0 ? value.slice(index + 1) : value;
};

/**
 * Catálogo de imagens reaproveitáveis: uma entrada por arquivo, mesmo que o banco
 * grave o mesmo caminho com ou sem barra inicial. Data URL legado (base64 na coluna)
 * fica de fora porque não é arquivo em uploads/. Mais usadas primeiro.
 */
export function existingImages(items: Equipment[]): ExistingImage[] {
  const byFile = new Map<string, ExistingImage>();

  for (const item of items) {
    const value = String(item.image || "").trim();
    if (!STORED_IMAGE.test(value)) continue;
    const filename = fileName(value);
    if (!filename) continue;

    const found = byFile.get(filename);
    if (found) {
      found.count += 1;
      if (item.name && !found.owners.includes(item.name)) found.owners.push(item.name);
      continue;
    }
    byFile.set(filename, {
      path: value.startsWith("/") ? value : `/${value}`,
      filename,
      count: 1,
      owners: item.name ? [item.name] : [],
    });
  }

  return [...byFile.values()].sort(
    (a, b) => b.count - a.count || a.filename.localeCompare(b.filename, "pt-BR"),
  );
}

/** Filtra o catálogo pelo nome do arquivo ou pelo nome de quem usa a imagem. */
export function filterImages(images: ExistingImage[], query: string): ExistingImage[] {
  const term = normalize(query);
  if (!term) return images;
  return images.filter(
    (image) =>
      normalize(image.filename).includes(term) ||
      image.owners.some((owner) => normalize(owner).includes(term)),
  );
}
