export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M5 25V7h8.5a5 5 0 0 1 0 10H5m8.5 0h6a4 4 0 0 1 0 8H5"
            stroke="currentColor"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M25 5v8m-4-4h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span>
          brasília<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
