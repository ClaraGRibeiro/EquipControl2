import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Package } from "lucide-react";
import { useState } from "react";
import { AppFooter } from "./app-footer";

export function LoginScreen({
  onAuthorized,
  notify,
}: {
  onAuthorized: () => void;
  notify: (message: string) => void;
}) {
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-transparent">

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm dark:bg-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (loginUser === "admin" && loginPassword === "otmg123") {
              localStorage.setItem("equipcontrol-auth", "ok");
              onAuthorized();
            } else notify("Usuário ou senha incorretos.");
          }}
        >
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Package />
            </div>
            <h1 className="mt-4 text-2xl font-bold">EquipControl</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Entre para acessar o inventário do OTMG
            </p>
          </div>
          <Field label="Usuário" required>
            <Input
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              required
              autoComplete="username"
            />
          </Field>
          <Field label="Senha" required>
            <Input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Button className="w-full" type="submit">
            Entrar
          </Button>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Acesso interno OTMG
          </p>
        </form>
      </main>
      <AppFooter />
    </div>
  );
}
