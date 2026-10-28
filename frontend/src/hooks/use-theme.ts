import { useEffect, useState } from "react";
import {
  applyTheme,
  readStoredTheme,
  rememberTheme,
  resolveTheme,
  type Theme,
} from "@/lib/theme";

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);

// Tema claro/escuro do app: escolha persistida, padrão pela preferência do sistema.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(readStoredTheme(), systemPrefersDark()),
  );

  useEffect(() => {
    applyTheme(theme);
    rememberTheme(theme);
  }, [theme]);

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme: () =>
      setTheme((current) => (current === "dark" ? "light" : "dark")),
  };
}
