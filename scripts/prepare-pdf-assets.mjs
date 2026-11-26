import { copyFile, cp, mkdir, readFile } from "node:fs/promises";

const manifest = new URL(import.meta.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(await readFile(manifest, "utf8"));
const destination = new URL(`../public/pdfjs/${version}/`, import.meta.url);
await mkdir(destination, { recursive: true });

await Promise.all([
  copyFile(new URL("LICENSE", manifest), new URL("LICENSE", destination)),
  copyFile(new URL("build/pdf.worker.min.mjs", manifest), new URL("pdf.worker.mjs", destination)),
  ...["cmaps", "standard_fonts", "iccs", "wasm"].map((directory) =>
    cp(new URL(directory, manifest), new URL(directory, destination), { recursive: true }),
  ),
]);
