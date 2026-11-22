export function paginationRange(total: number, requestedPage: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, requestedPage));
  const offset = (page - 1) * pageSize;
  return {
    total,
    page,
    pageSize,
    pages,
    offset,
    start: total ? offset + 1 : 0,
    end: Math.min(total, offset + pageSize),
  };
}
