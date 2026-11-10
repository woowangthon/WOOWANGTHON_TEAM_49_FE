export type DownloadType = "application/pdf" | "application/zip";

/** Quoted semicolons and escaped quotes belong to the parameter value. */
export function downloadFilename(header: string | null, fallback: string, type: DownloadType) {
  const values = new Map<string, string>();
  const pattern = /;\s*([\w*]+)\s*=\s*("(?:[^"\\]|\\.)*"|[^;]*)/g;
  for (const match of (header ?? "").matchAll(pattern)) {
    const key = match[1].toLowerCase();
    let value = match[2].trim();
    if (value.startsWith('"')) value = value.slice(1, -1).replace(/\\(.)/g, "$1");
    if (!values.has(key)) values.set(key, value);
  }
  let name = values.get("filename");
  const extended = values.get("filename*")?.match(/^UTF-8'[^']*'(.+)$/i);
  if (extended) {
    try { name = decodeURIComponent(extended[1]); } catch { /* use filename, then fallback */ }
  }
  const clean = (value: string) => value.normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
    .split(/[\\/]/).pop()!.replace(/[<>:"|?*]/g, "").replace(/\.{2,}/g, "")
    .replace(/^[.\s]+|[.\s]+$/g, "");
  name = clean(name ?? "") || clean(fallback) || "report";
  const extension = type === "application/pdf" ? ".pdf" : ".zip";
  // Do not retain a misleading executable or mismatched extension.
  name = name.replace(/\.[^.]*$/, "").slice(0, 160).replace(/[.\s]+$/, "") || "report";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = `_${name}`;
  return name + extension;
}

export function saveDownload({ blob, filename }: { blob: Blob; filename: string }) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Allow the browser to consume the click before releasing the URL.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
