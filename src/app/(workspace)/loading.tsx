export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-label="Carregando seu espaço">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-description" />
      <div className="skeleton skeleton-stats" />
      <div className="skeleton-columns">
        {[0, 1, 2].map((column) => (
          <div key={column}>
            {[0, 1, 2].map((card) => (
              <div className="skeleton skeleton-card" key={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
