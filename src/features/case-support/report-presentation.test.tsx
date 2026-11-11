// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { afterEach,it,expect,vi } from 'vitest';
import { ReportPresentation } from './report-presentation';
import type { Report } from './schemas';
afterEach(cleanup);
const report:Report={reportId:90,version:2,status:'READY',basedOnInputVersion:3,referencedSnapshots:{calculation:12,comparison:null},selectedDocumentIds:[],createdAt:'2026-11-11T01:00:00Z',isCurrent:false};
it('separates old READY files, preserves null snapshots and delegates downloads',()=>{
 const download=vi.fn();render(<ReportPresentation report={report} busy={false} downloadDisabled={false} download={download} feedback={null}/>);
 expect(screen.getByText('과거 입력 기준')).toBeVisible();expect(screen.getByRole('status')).toHaveTextContent('준비 완료');expect(screen.getByRole('list',{name:'보고서 다운로드'})).toBeVisible();expect(screen.getByText(/선택한 원본 없음/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'PDF 다운로드'}));fireEvent.click(screen.getByRole('button',{name:'원본 ZIP 다운로드'}));expect(download.mock.calls).toEqual([['pdf'],['originals']]);
 fireEvent.click(screen.getByText('참조 스냅샷 · 기술 상세'));expect(screen.getByText('12')).toBeVisible();expect(screen.getByText('없음',{selector:'dd'})).toBeVisible();
});
it.each(['PROCESSING','FAILED'] as const)('does not expose file actions for %s',status=>{
 render(<ReportPresentation report={{...report,status,errorCode:status==='FAILED'?'MOCK_REPORT_FAILED':null}} busy={false} downloadDisabled={false} download={vi.fn()} feedback={null}/>);
 expect(screen.queryByRole('list')).toBeNull();expect(screen.queryByRole('button')).toBeNull();expect(screen.getByRole('status')).toHaveTextContent(status);if(status==='FAILED')expect(screen.getByRole('alert')).toHaveTextContent('MOCK_REPORT_FAILED');
});
