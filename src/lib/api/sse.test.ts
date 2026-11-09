import { describe, expect, it } from "vitest";

import { readSseFrames, type SseFrame } from "./sse";

async function collect(chunks: Uint8Array[]) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
  const events: SseFrame[] = [];
  for await (const event of readSseFrames(stream)) events.push(event);
  return events;
}

describe("SSE transport frames", () => {
  it("handles Korean UTF-8 and CRLF boundaries split into individual bytes", async () => {
    const bytes = new TextEncoder().encode(': waiting\r\nevent: content_delta\r\ndata: {"delta":"월급"}\r\n\r\nevent: message_done\r\ndata: {"status":"COMPLETED"}\r\n\r\n');
    const events = await collect(Array.from(bytes, (byte) => Uint8Array.of(byte)));
    expect(events).toEqual([
      { event: "content_delta", data: '{"delta":"월급"}' },
      { event: "message_done", data: '{"status":"COMPLETED"}' },
    ]);
  });

  it("joins multiple data lines, ignores heartbeat comments and preserves error frames", async () => {
    const events = await collect([new TextEncoder().encode(': waiting\n\nid: 7\nevent: error\ndata: first\ndata: second\n\ndata: default-event\n\n')]);
    expect(events).toEqual([
      { event: "error", data: "first\nsecond", id: "7" },
      { event: "message", data: "default-event", id: "7" },
    ]);
  });

  it("does not dispatch a partial frame as successful completion", async () => {
    expect(await collect([new TextEncoder().encode('event: message_done\ndata: {}\n')])).toEqual([]);
  });

  it("cancels the reader when the consumer stops", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('data: first\n\ndata: second\n\n')); },
      cancel() { cancelled = true; },
    });
    for await (const frame of readSseFrames(stream)) {
      expect(frame.data).toBe("first");
      break;
    }
    expect(cancelled).toBe(true);
    expect(stream.locked).toBe(false);
  });

  it("propagates stream failures instead of treating EOF as message_done", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("stream interrupted")); } });
    const iterator = readSseFrames(stream);
    await expect(iterator.next()).rejects.toThrow("stream interrupted");
    expect(stream.locked).toBe(false);
  });
});
