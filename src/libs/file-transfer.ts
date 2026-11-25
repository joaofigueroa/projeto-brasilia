export function uploadSignedFile(
  grant: { url: string; fields: Record<string, string> },
  file: File,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(grant.fields)) form.append(name, value);
    form.append("file", file);
    const request = new XMLHttpRequest();
    request.open("POST", grant.url);
    request.timeout = 180000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error("Upload failed"));
    request.onerror = request.ontimeout = () => reject(new Error("Upload interrupted"));
    request.send(form);
  });
}

export function downloadSignedFile(file: { url: string; name: string }) {
  const link = document.createElement("a");
  link.href = file.url;
  link.download = file.name;
  link.rel = "noopener noreferrer";
  link.click();
}
