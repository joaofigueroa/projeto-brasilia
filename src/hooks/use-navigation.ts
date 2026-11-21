import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function useNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  function navigate(values: Record<string, string | null>, path = pathname) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values))
      value ? params.set(key, value) : params.delete(key);
    startTransition(() =>
      router.push(`${path}${params.size ? `?${params}` : ""}`, { scroll: false }),
    );
  }
  return { navigate, pending, router };
}
