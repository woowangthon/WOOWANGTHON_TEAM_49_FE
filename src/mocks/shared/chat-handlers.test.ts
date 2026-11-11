import { afterEach, expect, it, vi } from 'vitest';
import { getResponse } from 'msw';
import { chatMocks } from './chat-handlers';
import { consumeChat, type ChatEvent } from '@/features/chats/stream';

// Resolve handlers directly to control stream lifecycle without socket scheduling.
const base = 'http://mock.test/api/v1';
afterEach(() => vi.useRealTimers());
it.each([
  { readFirst: false, content: 'question', status: 'COMPLETED', terminal: 'message_done' },
  { readFirst: true, content: 'question', status: 'COMPLETED', terminal: 'message_done' },
  { readFirst: true, content: '\uC0DD\uC131 \uC2E4\uD328', status: 'FAILED', terminal: 'error' },
  { readFirst: true, content: 'cancel run', status: 'CANCELLED', terminal: 'message_done' },
])('replays $status after transport cancellation (readFirst=$readFirst)', async ({ readFirst, content, status, terminal }) => {
  vi.useFakeTimers();
  const mock = chatMocks(base, () => [{ caseId: 15, workplaceId: 3 }]);
  const root = `${base}/workplaces/3/chats`;
  const post = (url: string, body: unknown) => getResponse(mock.handlers, new Request(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  await post(root, { title: 'replay', defaultScope: { scopeType: 'CASE', caseId: 15 } });
  const chat = [...mock.chats.values()][0];
  const body = { content, clientMessageId: 'same-question' };
  const response = (await post(`${root}/${chat.chatId}/messages`, body))!;
  const reader = response.body!.getReader();
  if (readFirst) expect((await reader.read()).done).toBe(false);
  if (status === 'CANCELLED') {
    expect((await post(`${root}/${chat.chatId}/runs/${chat.messages[1].runId}/cancel`, {}))!.status).toBe(202);
  }
  expect((await post(`${root}/${chat.chatId}/messages`, body))!.status).toBe(409);
  // cancel() settles only after async start finishes; generation continues independently.
  const cancellation = reader.cancel();
  await vi.runAllTimersAsync();
  await cancellation;
  reader.releaseLock();
  expect(chat.messages[1].status).toBe(status);
  expect(vi.getTimerCount()).toBe(0);
  expect(response.body!.locked).toBe(false);
  const replay = (await post(`${root}/${chat.chatId}/messages`, body))!;
  const events: ChatEvent[] = [];
  await consumeChat(replay.body!, event => events.push(event));
  expect(events[0]).toMatchObject({ event: 'message_start', data: { messageId: chat.messages[1].messageId, runId: chat.messages[1].runId } });
  expect(events.at(-1)?.event).toBe(terminal);
  if (terminal === 'message_done') expect(events.at(-1)).toMatchObject({ data: { status } });
  expect(replay.body!.locked).toBe(false);
  const again = (await post(`${root}/${chat.chatId}/messages`, body))!;
  const repeated: ChatEvent[] = [];
  await consumeChat(again.body!, event => repeated.push(event));
  expect(repeated).toEqual(events);
  expect((await post(`${root}/${chat.chatId}/messages`, { ...body, content: 'changed' }))!.status).toBe(409);
  expect((await post(`${root}/${chat.chatId}/messages`, { ...body, scope: { scopeType: 'WORKPLACE_ALL' } }))!.status).toBe(409);
  expect(events.filter(e => e.event === 'content_delta').map(e => e.data.delta).join('')).toBe(chat.messages[1].content);
  expect(chat.messages).toHaveLength(2);
});
