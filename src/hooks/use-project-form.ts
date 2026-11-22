import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState, useTransition } from "react";
import { preparePhoto } from "@/libs/photo";
import { createProjectAction, saveProjectAction } from "@/server/actions/projects";
import type { Project } from "@/types/domain";
export function useProjectForm(project: Project | null, onSaved: () => void) {
  const router = useRouter();
  const [image, setImage] = useState(project?.image ?? "");
  const [error, setError] = useState("");
  const [photoPending, setPhotoPending] = useState(false);
  const [pending, startTransition] = useTransition();
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoPending(true);
    setError("");
    try {
      setImage(await preparePhoto(file));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível preparar a foto.");
    } finally {
      setPhotoPending(false);
      event.target.value = "";
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photoPending || pending) return;
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      image,
    };
    setError("");
    startTransition(async () => {
      const result = project
        ? await saveProjectAction({ ...input, id: project.id, version: project.version })
        : await createProjectAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved();
    });
  }
  return { image, error, pending, photoPending, upload, submit, removePhoto: () => setImage("") };
}
