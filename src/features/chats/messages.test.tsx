// @vitest-environment jsdom
import { render,screen,cleanup } from '@testing-library/react';
import { afterEach,it,expect } from 'vitest';
import { StoredMessage } from './chat-screen';
import type { Message } from './api';
afterEach(cleanup);
const message:Message={messageId:1,role:'ASSISTANT',content:'<script>alert(1)</script>\n개발용 설명',status:'COMPLETED',scope:{scopeType:'CASE',caseId:15},sources:[],resultRefs:[],runId:'r',errorCode:null,sourceMayBeOutdated:false};
it('renders untrusted content as text with actual scope',()=>{const {container}=render(<StoredMessage message={message} retry={()=>{}} busy={false}/>);expect(container.querySelector('script')).toBeNull();expect(screen.getByText('참조: Case #15')).toBeTruthy();expect(screen.queryByRole('button',{name:/재시도/})).toBeNull();});
it('shows retry only for failed or cancelled assistant',()=>{render(<StoredMessage message={{...message,status:'FAILED'}} retry={()=>{}} busy/>);expect(screen.getByRole('button',{name:/재시도/}).hasAttribute('disabled')).toBe(true);});
it('shows outdated warning and result identity',()=>{render(<StoredMessage message={{...message,sourceMayBeOutdated:true,resultRefs:[{type:'payslipValidation',snapshotId:3,version:1,caseId:15}]}} retry={()=>{}} busy={false}/>);expect(screen.getByRole('note').textContent).toContain('최신');expect(screen.getByText(/스냅샷 #3/)).toBeTruthy();expect(screen.getByRole('link').getAttribute('href')).toBe('/cases/15/result?snapshotType=payslipValidation&snapshotId=3&snapshotVersion=1');});
