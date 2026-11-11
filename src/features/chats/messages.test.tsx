// @vitest-environment jsdom
import { render,screen,cleanup,fireEvent } from '@testing-library/react';
import { afterEach,it,expect } from 'vitest';
import { StoredMessage } from './chat-screen';
import type { Message } from './api';
afterEach(cleanup);
const message:Message={messageId:1,role:'ASSISTANT',content:'<script>alert(1)</script>\n개발용 설명',status:'COMPLETED',scope:{scopeType:'CASE',caseId:15},sources:[],resultRefs:[],runId:'r',errorCode:null,sourceMayBeOutdated:false};
it('renders untrusted content as text with actual scope',()=>{const {container}=render(<StoredMessage message={message} retry={()=>{}} busy={false}/>);expect(container.querySelector('script')).toBeNull();expect(screen.getByText('참조: Case #15')).toBeTruthy();expect(screen.queryByRole('button',{name:/재시도/})).toBeNull();});
it('shows retry only for failed or cancelled assistant',()=>{render(<StoredMessage message={{...message,status:'FAILED'}} retry={()=>{}} busy/>);expect(screen.getByRole('button',{name:/재시도/}).hasAttribute('disabled')).toBe(true);});
it('shows outdated warning and result identity',()=>{render(<StoredMessage message={{...message,sourceMayBeOutdated:true,resultRefs:[{type:'payslipValidation',snapshotId:3,version:1,caseId:15}]}} retry={()=>{}} busy={false}/>);expect(screen.getByRole('note').textContent).toContain('최신');expect(screen.getByText(/스냅샷 #3/)).toBeTruthy();expect(screen.getByRole('link').getAttribute('href')).toBe('/cases/15/result?snapshotType=payslipValidation&snapshotId=3&snapshotVersion=1');});

it('keeps differing scope and warnings outside collapsed evidence and exposes empty sources',()=>{
 const {container}=render(<StoredMessage message={{...message,sourceMayBeOutdated:true}} currentScope={{scopeType:'WORKPLACE_ALL'}} retry={()=>{}} busy={false}/>);
 const details=container.querySelector('details')!;
 expect(details.open).toBe(false);
 expect(details.contains(screen.getByText('이 메시지 참조: Case #15'))).toBe(false);
 expect(details.contains(screen.getByRole('note'))).toBe(false);
 fireEvent.click(screen.getByText('출처 0건 · 공식 결과 0건'));
 expect(screen.getByText('연결된 문서 출처가 없습니다.')).toBeTruthy();
 expect(screen.getByText('저장 상태: COMPLETED')).toBeTruthy();
});

it('retries the failed assistant without needing to expand evidence',()=>{
 let calls=0;const {container}=render(<StoredMessage message={{...message,status:'CANCELLED'}} retry={()=>calls++} busy={false}/>);
 const button=screen.getByRole('button',{name:'실패·취소 답변 재시도'});
 expect(container.querySelector('details')!.contains(button)).toBe(false);
 fireEvent.click(button);expect(calls).toBe(1);
});
