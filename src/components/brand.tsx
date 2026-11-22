export function BrandMark() {
  return (
    <svg viewBox="0 0 40 44" fill="none" aria-hidden="true">
      <path
        d="M2 5h6c0 10 4 17 10 20v7C8 29 2 19 2 5Zm36 0h-6c0 10-4 17-10 20v7C32 29 38 19 38 5Z"
        fill="currentColor"
      />
      <path d="M18 1h4v42h-4z" fill="currentColor" />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <BrandMark />
      </span>
      {!compact && <span className="brand-wordmark">Brasília</span>}
    </span>
  );
}
