export type Theme = "light" | "dark";

// Chave única do tema. O script inline do index.html lê a mesma chave para
// aplicar o tema antes da primeira pintura (evita flash claro/escuro).
export const THEME_STORAGE_KEY = "equipcontrol-theme";

const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark";

// Regra de decisão: escolha salva > preferência do sistema > claro.
export function resolveTheme(stored: unknown, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "light";
}

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sem storage (modo privado/hibernado): o tema vale só para a sessão.
  }
}

// Aplica o tema no documento; .dark ativa os tokens escuros do index.css.
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;

  // A cor da barra do celular acompanha o tema escolhido no app.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#10141e" : "#f7f9fc");
}
