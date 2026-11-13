"use client";
import { Languages, ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useRef, useState, useId } from 'react';
import { locales, languageCatalog, type BackendLanguage } from './config';
import { useLanguage } from './language-provider';
export function LanguageSelector() {
  const t = useTranslations('common');
  const {locale, pending, error, select} = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  const name = (code: BackendLanguage) => languageCatalog[code].name;
  function close() { setOpen(false); trigger.current?.focus(); }
  return <div ref={root} className="language-selector" onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); setOpen(true);
      requestAnimationFrame(() => {
        const options = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        options[event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : index < 0 ? (event.key === 'ArrowUp' ? options.length - 1 : 0) : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length]?.focus();
      });
    }
  }}>
    <button ref={trigger} type="button" aria-label={t('languageSelect')} aria-haspopup="menu" aria-expanded={open} aria-controls={id} disabled={pending} aria-busy={pending} className="language-trigger" onClick={() => setOpen(!open)}>
      <Languages size={16} aria-hidden="true" /><span>{t('languageLabel')}</span><ChevronDown size={13} aria-hidden="true" />
    </button>
    {open && <div id={id} role="menu" aria-label={t('languageSelect')} className="language-menu">
      {locales.map(code => <button key={code} title={code === 'ko' ? t('languageKo') : undefined} type="button" role="menuitemradio" aria-checked={code === locale} disabled={pending} onClick={() => {void select(code); close();}}>
        <Image src={languageCatalog[code].flagSrc} width={24} height={16} alt="" aria-hidden="true" className="language-flag" /><span lang={code}>{name(code)}</span>{code === locale && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
    {error && <p role="alert" className="language-error">{error}</p>}
  </div>;
}
