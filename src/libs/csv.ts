// RFC 4180 quoting, UTF-8 BOM and either comma or semicolon separators.
export function parseCsv(text: string): Record<string, string>[] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const first = input.split("\n", 1)[0];
  const delimiter = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let closedQuote = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (closedQuote && char !== delimiter && char !== "\n") {
      if (char === " " || char === "\t") continue;
      throw new Error("Texto inválido após aspas no CSV.");
    }
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i++;
      } else if (!quoted && value.length) throw new Error("Aspas inválidas no CSV.");
      else {
        closedQuote = quoted;
        quoted = !quoted;
      }
    } else if (!quoted && (char === delimiter || char === "\n")) {
      row.push(value.trim());
      value = "";
      closedQuote = false;
      if (char === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else value += char;
  }
  if (quoted) throw new Error("O CSV contém aspas não fechadas.");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((x) => x.toLowerCase()) ?? [];
  if (
    !headers.length ||
    headers.some((header) => !header) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("O CSV precisa de colunas únicas.");
  if (rows.length > 500) throw new Error("Importe até 500 linhas por arquivo.");
  return rows.map((cells, index) => {
    if (cells.length !== headers.length)
      throw new Error(`Confira o número de colunas na linha ${index + 2}.`);
    return Object.fromEntries(headers.map((key, i) => [key, cells[i]]));
  });
}
