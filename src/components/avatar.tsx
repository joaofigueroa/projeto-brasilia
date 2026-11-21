import { avatarColor, initials } from "@/libs/presentation";

export function Avatar({
  user,
  size = "md",
  className = "",
}: {
  user: { name: string; image?: string | null };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <span
      className={`avatar avatar-${size} avatar-${avatarColor(user.name)} ${className}`}
      title={user.name}
    >
      {user.image ? (
        <img src={user.image} alt={user.name} width={80} height={80} />
      ) : (
        <span role="img" aria-label={user.name}>
          {initials(user.name)}
        </span>
      )}
    </span>
  );
}
