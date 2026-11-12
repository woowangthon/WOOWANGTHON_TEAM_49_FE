import type { ReactNode } from 'react';
import { cardStyle, secondaryButton } from '@/components/ui/styles';
import type { Report } from './schemas';

/** Display only: availability is still checked by the existing download endpoint. */
export function ReportPresentation({ report:r, busy, downloadDisabled, download, feedback }: {
 report:Report; busy:boolean; downloadDisabled:boolean; download:(kind:'pdf'|'originals')=>void; feedback:ReactNode;
}) {
 const ready=r.status==='READY';
 return <article className={`${cardStyle} space-y-4`} aria-label={`보고서 ${r.reportId}`}>
  <header className="space-y-2 border-b border-border pb-4">
   <p className="text-caption font-bold">{r.isCurrent===true?'현재 입력 기준':r.isCurrent===false?'과거 입력 기준':'최신성 미제공'}</p>
   <h2 className="text-title font-extrabold">보고서 #{r.reportId} · 상담 자료</h2>
   <p role="status">{ready?'보고서 준비 완료':r.status==='PROCESSING'?'보고서 생성 중':'보고서 생성 실패'} · {r.status}</p>
   <p>생성 시각: <time>{r.createdAt}</time></p>
  </header>
  {r.isCurrent===false&&<p role="note">과거 입력으로 만든 보고서입니다. 현재 결과와 구분하여 확인하세요.</p>}
  {r.status==='PROCESSING'&&<p>생성 상태를 자동으로 확인하고 있습니다. 완료되면 다운로드할 수 있습니다. 새 요청 없이 기다려 주세요.</p>}
  {r.status==='FAILED'&&<p role="alert">오류 정보: {r.errorCode??'오류 코드 미제공'}. 원인을 확인한 후 위의 생성 요청에서 새 보고서를 요청하세요. 이전에 완료된 보고서는 각각의 상태를 확인하세요.</p>}
  {ready?<ul aria-label="보고서 다운로드" className="divide-y divide-border rounded-panel border border-border">
   {(['pdf','originals'] as const).map(kind=><li key={kind} className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
    <div className="min-w-0"><h3 className="font-bold">{kind==='pdf'?'상담용 보고서':'선택 원본 묶음'}</h3><p className="text-caption text-muted">{kind==='pdf'?'PDF':'ZIP'} · {r.createdAt}</p>{kind==='originals'&&!r.selectedDocumentIds.length&&<p className="text-caption">선택한 원본 없음 · 파일 제공 여부는 다운로드 시 확인됩니다.</p>}</div>
    <button className={secondaryButton} disabled={downloadDisabled} onClick={()=>download(kind)}>{kind==='pdf'?'PDF 다운로드':'원본 ZIP 다운로드'}</button>
   </li>)}
  </ul>:<p>아직 다운로드할 수 없습니다.</p>}
  {busy&&<p role="status">다운로드 요청 중…</p>}
  <details><summary>참조 스냅샷 · 기술 상세</summary><p>기준 입력 {r.basedOnInputVersion} · 보고서 버전 {r.version}</p><p>포함 원본 ID: {r.selectedDocumentIds.join(', ')||'없음'}</p><p>규칙 버전: {r.ruleSetVersions?.join(', ')??'미제공'}</p><dl>{Object.entries(r.referencedSnapshots).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value.snapshotId??'없음'}</dd></div>)}</dl></details>
  {feedback}
 </article>;
}
