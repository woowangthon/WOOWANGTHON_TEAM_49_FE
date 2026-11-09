/** Transport frames only. Feature code must validate P0 event payloads separately. */
export interface SseFrame {
  event: string;
  data: string;
  id?: string;
}

export async function* readSseFrames(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "message";
  let data: string[] = [];
  let id: string | undefined;

  function line(value: string): SseFrame | undefined {
    if (value === "") {
      const frame = data.length ? { event, data: data.join("\n"), ...(id === undefined ? {} : { id }) } : undefined;
      event = "message";
      data = [];
      return frame;
    }
    if (value.startsWith(":")) return;
    const colon = value.indexOf(":");
    const field = colon === -1 ? value : value.slice(0, colon);
    const content = colon === -1 ? "" : value.slice(colon + 1).replace(/^ /, "");
    if (field === "event") event = content || "message";
    if (field === "data") data.push(content);
    if (field === "id" && !content.includes("\0")) id = content;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.search(/[\r\n]/)) !== -1) {
        // CRLF can be split across network chunks.
        if (!done && buffer[newline] === "\r" && newline === buffer.length - 1) break;
        const width = buffer[newline] === "\r" && buffer[newline + 1] === "\n" ? 2 : 1;
        const frame = line(buffer.slice(0, newline));
        buffer = buffer.slice(newline + width);
        if (frame) yield frame;
      }
      // An unterminated frame is deliberately not dispatched at EOF.
      if (done) break;
    }
  } finally {
    try { await reader.cancel(); } finally { reader.releaseLock(); }
  }
}
