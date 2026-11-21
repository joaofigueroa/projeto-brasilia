export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Escolha uma foto JPG, PNG ou WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Escolha uma foto de até 5 MB.");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 12000 || bitmap.height > 12000) {
    bitmap.close();
    throw new Error("Escolha uma imagem com dimensões menores.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível preparar sua foto.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    256,
    256,
  );
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.85);
}
