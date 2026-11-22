import { Layers3 } from "lucide-react";
export function ProjectImage({
  project,
  size = "sm",
}: {
  project?: { name: string; image: string | null; color: string };
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={`project-image project-image-${size} project-${project?.color ?? "lilac"}`}
      aria-hidden="true"
    >
      {project?.image ? (
        <img src={project.image} alt="" width={128} height={128} />
      ) : (
        <Layers3 size={size === "lg" ? 28 : 18} />
      )}
    </span>
  );
}
