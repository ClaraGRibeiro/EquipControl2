export function assetUrl(path?: string) {
  if (!path) return "";
  return path.startsWith("http") || path.startsWith("data:") ? path : path;
}
export function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}
