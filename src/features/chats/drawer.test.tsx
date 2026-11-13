// @vitest-environment jsdom
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { afterEach,beforeEach,it,expect,vi } from 'vitest';
import { MobileNavigation } from '@/components/layout/mobile-navigation';
beforeEach(()=>{
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 HTMLDialogElement.prototype.showModal=function(){this.open=true;this.querySelector('button')?.focus();};
 HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();document.body.style.overflow='';});
it('opens a named chat drawer, locks scroll, closes on selection and restores focus',()=>{
 render(<MobileNavigation label="채팅 목록" title="대화 목록"><a href="#selected" aria-current="page">선택한 채팅</a></MobileNavigation>);
 const trigger=screen.getByRole('button',{name:'채팅 목록 열기'});fireEvent.click(trigger);const dialog=screen.getByRole('dialog',{name:'대화 목록'});expect((dialog as HTMLDialogElement).open).toBe(true);expect(document.body.style.overflow).toBe('hidden');expect(dialog.contains(document.activeElement)).toBe(true);fireEvent.click(screen.getByRole('link',{name:'선택한 채팅'}));expect((dialog as HTMLDialogElement).open).toBe(false);expect(document.activeElement).toBe(trigger);expect(document.body.style.overflow).toBe('');
});
it('provides close control and restores scroll on unmount',()=>{const {unmount}=render(<MobileNavigation label="채팅 목록" title="대화 목록"><p>목록</p></MobileNavigation>);fireEvent.click(screen.getByRole('button',{name:'채팅 목록 열기'}));fireEvent.click(screen.getByRole('button',{name:'채팅 목록 닫기'}));expect(document.body.style.overflow).toBe('');fireEvent.click(screen.getByRole('button',{name:'채팅 목록 열기'}));unmount();expect(document.body.style.overflow).toBe('');});
