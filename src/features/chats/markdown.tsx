'use client';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function ChatMarkdown({content}:{content:string}){
 return <div className="min-w-0 space-y-3 [overflow-wrap:anywhere] [&_p]:whitespace-pre-wrap [&_h1]:text-xl [&_h2]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-neutral-soft [&_pre]:p-3 [&_code]:font-mono [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2">
 <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
 a:({href,children})=>href&&/^(https?:\/\/|mailto:)/i.test(href)?<a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>:<span>{children}</span>,
 img:({alt})=><span>[외부 이미지 자동 로드 안 함: {alt??'이미지'}]</span>,
 table:({children})=><div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="답변 표"><table>{children}</table></div>,
 }}>{content}</Markdown></div>;
}
