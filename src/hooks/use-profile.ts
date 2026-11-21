import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";
import { preparePhoto } from "@/libs/photo";
import { changePasswordAction, updateProfileAction } from "@/server/actions/users";
import type { PublicUser } from "@/types/domain";

export function useProfile(user: PublicUser) {
  const router = useRouter();
  const [image, setImage] = useState<string | undefined>();
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [photoPending, setPhotoPending] = useState(false);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoPending(true);
    setError("");
    try {
      setImage(await preparePhoto(file));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível preparar sua foto.");
    } finally {
      setPhotoPending(false);
      event.target.value = "";
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await updateProfileAction({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        jobTitle: String(form.get("jobTitle") ?? ""),
        currentPassword: String(form.get("currentPassword") ?? ""),
        image,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data.requiresLogin) {
        router.push("/login?updated=email");
        router.refresh();
        return;
      }
      setNotice("Seu perfil está atualizado.");
      router.refresh();
    });
  }
  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const password = String(form.get("newPassword") ?? "");
    if (password !== form.get("confirmPassword")) {
      setPasswordError("A confirmação deve ser igual à nova senha.");
      return;
    }
    setPasswordError("");
    startPasswordTransition(async () => {
      const result = await changePasswordAction({
        currentPassword: String(form.get("currentPassword") ?? ""),
        newPassword: password,
      });
      if (!result.success) {
        setPasswordError(result.error);
        return;
      }
      element.reset();
      setNotice("Senha alterada. Os outros acessos foram encerrados.");
    });
  }
  return {
    image,
    email,
    setEmail,
    error,
    passwordError,
    notice,
    dismissNotice: () => setNotice(""),
    pending,
    passwordPending,
    photoPending,
    upload,
    submit,
    submitPassword,
    removePhoto: () => setImage(""),
  };
}
