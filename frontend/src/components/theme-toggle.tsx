import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/theme";

// Botão de tema usado no header (ícone) e no menu do celular (ícone + texto).
export function ThemeToggle({
  theme,
  onToggle,
  withLabel = false,
  className,
}: {
  theme: Theme;
  onToggle: () => void;
  withLabel?: boolean;
  className?: string;
}) {
  const isDark = theme === "dark";
  const label = isDark ? "Usar tema claro" : "Usar tema escuro";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={className}
    >
      {isDark ? (
        <Sun className={withLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      ) : (
        <Moon className={withLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      )}
      {withLabel && (isDark ? "Tema claro" : "Tema escuro")}
    </Button>
  );
}
