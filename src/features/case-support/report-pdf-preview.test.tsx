// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportPdfPreview } from './report-pdf-preview';
vi.mock('next/dynamic',()=>({default:()=>()=>null}));
afterEach(()=>{cleanup();vi.restoreAllMocks()});

it('prints the authenticated PDF frame, closes on Escape and releases its URL on unmount',async()=>{
 const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:private-report');
 const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 HTMLDialogElement.prototype.showModal=function(){this.open=true};
 HTMLDialogElement.prototype.close=function(){this.open=false};
 const close=vi.fn(), trigger=document.createElement('button');document.body.append(trigger);trigger.focus();
 const file={blob:new Blob(['%PDF-1.4'],{type:'application/pdf'}),filename:'report.pdf'};
 const view=render(<ReportPdfPreview file={file} onClose={close}/>);
 const frame=screen.getByTitle('인쇄할 보고서 PDF') as HTMLIFrameElement;
 await waitFor(()=>expect(frame).toHaveAttribute('src','blob:private-report'));
 const print=vi.spyOn(frame.contentWindow!,'print').mockImplementation(()=>{});
 vi.spyOn(frame.contentWindow!,'focus').mockImplementation(()=>{});
 fireEvent.load(frame);fireEvent.click(screen.getByRole('button',{name:'인쇄'}));
 expect(print).toHaveBeenCalledOnce();expect(create).toHaveBeenCalledWith(file.blob);
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{cancelable:true}));expect(close).toHaveBeenCalledOnce();
 view.unmount();expect(revoke).toHaveBeenCalledWith('blob:private-report');expect(document.activeElement).toBe(trigger);trigger.remove();
});
