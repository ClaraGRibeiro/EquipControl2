import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState("");
  const notify = useCallback((message: string) => setToast(message), []);

  return { toast, setToast, notify };
}
