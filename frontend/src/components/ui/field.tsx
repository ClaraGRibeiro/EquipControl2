export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>
        {label}
        {required ? (
          <span className="ml-1 text-red-600 dark:text-red-400" aria-label="obrigatório">
            *
          </span>
        ) : (
          <span className="ml-1 font-normal text-slate-400">(opcional)</span>
        )}
      </span>
      {children}
    </label>
  );
}
