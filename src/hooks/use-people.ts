import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { configureUserAction, createUserAction } from "@/server/actions/users";
import type { PublicUser } from "@/types/domain";

export function usePersonForm(user: PublicUser | null, onSaved: () => void) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      jobTitle: String(form.get("jobTitle") ?? ""),
      role: String(form.get("role") ?? "collaborator"),
    };
    const password = String(form.get("password") ?? "");
    if (user && password !== String(form.get("passwordConfirmation") ?? "")) {
      setError("A confirmação deve ser igual à nova senha.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = user
        ? await configureUserAction({ ...input, id: user.id, newPassword: password || undefined })
        : await createUserAction({ ...input, password });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }
  return { submit, pending, error };
}
