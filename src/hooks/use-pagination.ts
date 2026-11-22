import { useState } from "react";
import { paginationRange } from "@/libs/pagination";

export function usePagination<T>(items: T[], resetKey: string, initialSize = 20) {
  const [selection, setSelection] = useState({ key: resetKey, page: 1, size: initialSize });
  const range = paginationRange(
    items.length,
    selection.key === resetKey ? selection.page : 1,
    selection.size,
  );
  return {
    ...range,
    items: items.slice(range.offset, range.offset + range.pageSize),
    onPageChange: (page: number) => setSelection({ key: resetKey, page, size: range.pageSize }),
    onPageSizeChange: (size: number) => setSelection({ key: resetKey, page: 1, size }),
  };
}
