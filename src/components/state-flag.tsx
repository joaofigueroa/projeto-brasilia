import flags from "@/data/state-flags.json";
export function stateFlagPath(code: string) {
  return flags[code as keyof typeof flags]?.file;
}
export function StateFlag({ code, name }: { code: string; name: string }) {
  const src = stateFlagPath(code);
  return src ? (
    <img className="state-flag" src={src} alt={`Bandeira de ${name}`} width={28} height={20} />
  ) : null;
}
