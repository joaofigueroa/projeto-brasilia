import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { authClient } from "@/libs/auth-client";

export function useLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = await authClient.signIn.email({
          email: String(form.get("email") ?? "")
            .trim()
            .toLowerCase(),
          password: String(form.get("password") ?? ""),
        });
        if (result.error) {
          setError(
            result.error.status === 429
              ? "Muitas tentativas. Aguarde um minuto e tente novamente."
              : "E-mail ou senha incorretos. Confira seus dados.",
          );
          return;
        }
        router.push("/tarefas");
        router.refresh();
      } catch {
        setError("Não foi possível conectar agora. Tente novamente.");
      }
    });
  }
  return { submit, error, pending };
}
