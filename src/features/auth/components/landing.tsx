"use client";
import {useMessageState} from '@/i18n/use-message-state';
import {message as describeMessage} from '@/i18n/message';

import {useLocalized} from '@/i18n/use-translation';
import type {Translation} from '@/i18n/translate';

import { useTranslation } from '@/i18n/use-translation';

import Link from 'next/link';
import { BrandLink } from '@/components/layout/brand-link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDown, Check, CheckCheck, FileText, Files, Clock3, Calculator, CircleHelp, Link2, ScanLine, Wallet, FolderOpen, Plus, ShieldCheck, Copy, CheckCircle2, Menu, X, Building2, Download, MessageCircle, MoveRight } from 'lucide-react';
import styles from './landing.module.css';
function classes(names: string) {
    return names.split(/\s+/).filter(Boolean).map(name => styles[name]).join(' ');
}
type MotionStyle = CSSProperties & {
    '--i'?: number;
    '--delay'?: string;
};

function Logo() {
 const {translate} = useTranslation();

    return <BrandLink className={classes("logo")} aria-label={translate("auth.landing_monthlyWage")}><span className={classes("logo-symbol")} aria-hidden="true"><Link2 aria-hidden="true" size={26} strokeWidth={3}/></span>{translate("common.brand")}<span className={classes("logo-dot")}>.</span></BrandLink>;
}
function Counter({ value }: {
    value: number;
}) {
    const {locale: defaultLocale} = useTranslation();
    const ref = useRef<HTMLSpanElement>(null);
    const [number, setNumber] = useState(value);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.IntersectionObserver)
            return;
        let raf = 0;
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting)
                return;
            observer.disconnect();
            const start = performance.now();
            const tick = (now: number) => {
                const progress = Math.min((now - start) / 1150, 1);
                setNumber(Math.round(value * (1 - Math.pow(1 - progress, 4))));
                if (progress < 1)
                    raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        }, { threshold: .55 });
        if (ref.current)
            observer.observe(ref.current);
        return () => { observer.disconnect(); cancelAnimationFrame(raf); };
    }, [value]);
    return <span ref={ref}><span aria-hidden="true">{number.toLocaleString(defaultLocale)}</span><span className={classes("sr-only")}>{value.toLocaleString(defaultLocale)}</span></span>;
}
function DocumentRows({ compact = false }) {
const {documents} = useLocalized(createPresentation);

    return <div className={classes(compact ? 'document-rows compact' : 'document-rows')}>
    {documents.map(({ icon: Icon, name, file, status, color }, i) => <div className={classes("document-row")} style={{ '--i': i } as MotionStyle} key={name}>
      <span className={classes('file-icon ' + color)}><Icon aria-hidden="true" size={23}/></span><div><strong>{name}</strong><span>{file}</span></div><span className={classes("file-status")}>{status}<Check aria-hidden="true" size={13}/></span>
    </div>)}
  </div>;
}
function PayBreakdown({ count = false }) {
 const {translate} = useTranslation();

    return <div className={classes("pay-breakdown")}>
    <span className={classes("mini-label")}>{translate("auth.landing_deduction_wage_example")}</span>
    <div className={classes("pay-total")}>{count ? <Counter value={2200000}/> : '2,200,000'}<small>{translate("common.won")}</small></div>
    <div className={classes("pay-stack")} aria-hidden="true"><span /><span /><span /><span /></div>
    <dl>{[[translate("auth.landing_basePay"), '1,600,000'], [translate("auth.landing_allowance"), '320,000'], [translate("auth.landing_work_allowance"), '180,000'], [translate("auth.landing_payment_item"), '100,000']].map(([label, value], i) => <div key={label}><dt><span className={classes('pay-dot dot-' + i)}/>{label}</dt><dd>{value}<span>{translate("common.won")}</span></dd></div>)}</dl>
    <p className={classes("visual-note")}>{translate("auth.landing_confirm_included_item_calculation")}</p>
  </div>;
}
function VerifyPreview() {
 const {translate} = useTranslation();

    return <div className={classes("verify-preview")}>
    <div className={classes("mini-paper")}><span className={classes("paper-kicker")}>{translate("auth.landing_original_page")}</span><h4>{translate("auth.landing_payslip")}</h4><div className={classes("paper-rule")}/><div><span>{translate("auth.landing_payment_total")}</span><b>2,200,000</b></div><div><span>{translate("auth.landing_deduction_total")}</span><b>100,000</b></div><div className={classes("source-highlight")}><span>{translate("auth.landing_netPay")}</span><b>2,100,000</b></div><span className={classes("paper-stamp")}>{translate("auth.landing_div8")}</span></div>
    <span className={classes("source-arrow")}><MoveRight aria-hidden="true" size={22}/></span>
    <div className={classes("verified-fields")}><span className={classes("mini-label")}>{translate("auth.landing_div9")}</span><span className={classes("mock-field")}><small>{translate("auth.landing_netPay")}</small><strong>2,100,000<span>{translate("common.won")}</span></strong></span><span className={classes("checked-field")}><CheckCircle2 aria-hidden="true" size={16}/> {translate("auth.landing_original_confirm_2")}</span><p>{translate("auth.landing_confirm_3")}<br />{translate("auth.landing_calculation_use")}</p></div>
  </div>;
}
function ComparePreview() {
 const {translate} = useTranslation();

    return <div className={classes("compare-preview")}><div className={classes("compare-pair")}><div><FileText aria-hidden="true" size={24}/><span>{translate("auth.landing_payslip_netPay")}</span><strong>2,100,000<small>{translate("common.won")}</small></strong></div><div><Wallet aria-hidden="true" size={24}/><span>{translate("auth.landing_link_deposit_sum")}</span><strong>2,000,000<small>{translate("common.won")}</small></strong></div></div><div className={classes("difference-line")}><span>{translate("auth.landing_current_record_confirm_difference")}</span><strong>{translate("auth.landing_div13")}</strong></div><div className={classes("linked-transfers")}><span><Check aria-hidden="true" size={14}/> {translate("auth.landing_span3")}</span><span><Check aria-hidden="true" size={14}/> {translate("auth.landing_span4")}</span></div><p className={classes("visual-note")}>{translate("auth.landing_difference_unpaid")}</p></div>;
}
function HeroPreview({ active }: {
    active: number;
}) {
 const {translate} = useTranslation();

    return <div className={classes("product-preview")} aria-label={translate("auth.landing_example")}>
    <div className={classes("preview-toolbar")}><span className={classes("preview-dots")} aria-hidden="true"><i /><i /><i /></span><span>{translate("common.brand")}</span><span className={classes("example-label")}>{translate("auth.landing_example_2")}</span></div>
    <div className={classes("preview-content")} id="landing-preview" aria-live="polite" aria-atomic="true" key={active}>
      <div className={classes("preview-context")}><span><Building2 aria-hidden="true" size={13}/> {translate("auth.landing_span5")}</span><span>{translate("auth.landing_div16")}</span></div>
      <h3>{[translate("auth.landing_monthlyWage_2"), translate("auth.landing_original_confirm_3"), translate("auth.landing_wage"), translate("auth.landing_deposit_continue_confirm")][active]}</h3>
      {active === 0 && <><DocumentRows compact/><div className={classes("preview-bottom")}><span>{translate("auth.landing_file_none_input")}</span><Plus aria-hidden="true" size={18}/></div></>}
      {active === 1 && <VerifyPreview />}
      {active === 2 && <PayBreakdown />}
      {active === 3 && <ComparePreview />}
    </div>
  </div>;
}
export function Landing() {
const {features, inquiry} = useLocalized(createPresentation);

 const {translate} = useTranslation();

    const [active, setActive] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useMessageState('');
    const copyRef = useRef<HTMLParagraphElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const root = rootRef.current;
        if (!root)
            return;
        if (!window.IntersectionObserver)
            return;
        let observer: IntersectionObserver | undefined;
        const setup = () => {
            observer?.disconnect();
            root.classList.toggle(styles['motion-ready'], !media.matches);
            if (media.matches)
                return;
            observer = new IntersectionObserver(entries => entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(styles.revealed);
                    observer?.unobserve(entry.target);
                }
            }), { threshold: .12, rootMargin: '0px 0px -20px 0px' });
            root.querySelectorAll('[data-reveal]').forEach(el => observer?.observe(el));
        };
        setup();
        media.addEventListener('change', setup);
        return () => { observer?.disconnect(); media.removeEventListener('change', setup); root.classList.remove(styles['motion-ready']); };
    }, []);
    useEffect(() => {
        if (!menuOpen)
            return;
        const close = (e: KeyboardEvent) => { if (e.key === 'Escape') {
            setMenuOpen(false);
            menuRef.current?.focus();
        } };
        document.addEventListener('keydown', close);
        return () => document.removeEventListener('keydown', close);
    }, [menuOpen]);
    async function copyInquiry() {
        try {
            await navigator.clipboard.writeText(inquiry);
            setCopyStatus(describeMessage("auth.landing_example_3"));
        }
        catch {
            setCopyStatus(describeMessage("auth.landing_select"));
            copyRef.current?.focus();
        }
    }
    return <div className={styles.landing} ref={rootRef}>
    <header className={classes("site-header")}><div className={classes("header-inner")}><Logo /><nav className={classes(menuOpen ? 'main-nav open' : 'main-nav')} id="main-navigation" aria-label={translate("auth.landing_menu")}><a href="#features" onClick={() => setMenuOpen(false)}>{translate("auth.landing_nav")}</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>{translate("auth.landing_nav2")}</a><a href="#questions" onClick={() => setMenuOpen(false)}>{translate("auth.landing_question")}</a></nav><Link className={classes("header-cta")} href="/signup">{translate("auth.landing_start")}<ArrowUpRight aria-hidden="true" size={16}/></Link><button type="button" ref={menuRef} className={classes("menu-toggle")} aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? translate("auth.landing_menu_close") : translate("auth.landing_menu_2")} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}</button></div></header>
    <main id="main-content" tabIndex={-1}>
      <section className={classes("hero")} aria-labelledby="hero-title">
        <div className={classes("hero-inner")}>
          <div className={classes("hero-copy")} data-reveal>
            <span className={classes("eyebrow")}><span /> {translate("auth.landing_count")}</span>
            <h1 id="hero-title">{translate("auth.landing_record_2")}<br />{translate("auth.landing_monthlyWage_3")}<em>{translate("auth.landing_h13")}</em></h1>
            <p>{translate("auth.landing_contract_deposit")}<br />{translate("auth.landing_link")}<br className={classes("desktop-br")}/> {translate("auth.landing_monthlyWage_evidence_confirm")}</p>
            <Link className={classes("button button-primary")} href="/login">{translate("auth.landing_monthlyWage_confirm")}<ArrowRight aria-hidden="true" size={19}/></Link>
            <span className={classes("cta-caption")}>{translate("auth.landing_record_start_confirm_evidence")}</span>
          </div>
          <div className={classes("hero-product")} data-reveal style={{ '--delay': '140ms' } as MotionStyle}><div className={classes("preview-halo")} aria-hidden="true"/><HeroPreview active={active}/><span className={classes("product-caption")}><ShieldCheck aria-hidden="true" size={15}/> {translate("auth.landing_confirm_start_monthlyWage_evidence")}</span></div>
        </div>
        <div className={classes("feature-switcher")} role="group" aria-label={translate("auth.landing_ariaLabel_div2")}>
          {features.map(({ number, label, detail, icon: Icon }, i) => <button type="button" key={number} aria-controls="landing-preview" aria-pressed={active === i} onClick={() => setActive(i)} className={classes('feature-switch ' + (active === i ? 'selected' : ''))}><span className={classes("feature-icon")}><Icon aria-hidden="true" size={24}/></span><span><span className={classes("feature-number")}>{number}</span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight aria-hidden="true" className={classes("feature-arrow")} size={17}/></button>)}
        </div>
        <a className={classes("scroll-cue")} href="#features">{translate("auth.landing_monthlyWage_confirm_2")}<ArrowDown aria-hidden="true" size={17}/></a>
      </section>

      <div id="features" className={classes("feature-intro section-wrap")} data-reveal><p className={classes("section-label")}>{translate("auth.landing_monthlyWage_count")}</p><h2>{translate("auth.landing_monthlyWage_confirm_3")}<br />{translate("auth.landing_link_2")}</h2></div>

      <section className={classes("feature-section section-wrap gather-section")} id="gather">
        <div className={classes("section-copy")} data-reveal><span className={classes("section-label")}>{translate("auth.landing_record_3")}</span><h2>{translate("auth.landing_h23")}<br /><em>{translate("auth.landing_h24")}</em></h2><p>{translate("auth.landing_contract_attendance_payslip_deposit_case")}<br />{translate("auth.landing_workplace_wage_wagePeriod")}<br />{translate("auth.landing_record_empty_start_count")}</p><Link href="/login" className={classes("text-action")}>{translate("auth.landing_record_start")}<ArrowRight aria-hidden="true" size={18}/></Link><div className={classes("support-formats")}><span>PDF</span><span>JPG</span><span>PNG</span><span>{translate("auth.landing_input")}</span></div><small className={classes("scope-note")}>{translate("auth.landing_pdf_file_create_count")}</small></div>
        <div className={classes("collection-scene")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><span className={classes("scene-label")}>{translate("auth.landing_library_example")}</span><div className={classes("folder-head")}><span><FolderOpen aria-hidden="true" size={24}/><strong>{translate("auth.landing_span8")}</strong></span><span>{translate("auth.landing_div24")}</span></div><DocumentRows /><div className={classes("collection-footer")}><CheckCheck aria-hidden="true" size={18}/><span>{translate("auth.landing_workplace_period")}</span></div></div>
      </section>

      <section className={classes("verify-section")}>
        <div className={classes("section-wrap feature-section reverse")}><div className={classes("verify-scene")} data-reveal><div className={classes("scene-heading")}><span className={classes("section-label")}>{translate("auth.landing_original_confirm_4")}</span><span className={classes("example-label")}>{translate("auth.landing_example_2")}</span></div><VerifyPreview /><div className={classes("verify-result")}><CheckCircle2 aria-hidden="true" size={20}/><div><strong>{translate("auth.landing_confirm_4")}</strong><p>{translate("auth.landing_invalid_original_archived")}</p></div></div></div><div className={classes("section-copy")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><span className={classes("section-label")}>{translate("auth.landing_original_confirm_5")}</span><h2>{translate("auth.landing_h25")}<br /><em>{translate("auth.landing_h26")}</em></h2><p>{translate("auth.landing_amount_time_applicable_period_original_confirm")}<br />{translate("auth.landing_confirm_next_calculation")}<br />{translate("auth.landing_count_2")}</p><span className={classes("inline-hint")}><ScanLine aria-hidden="true" size={18}/> {translate("auth.landing_source_confirm_continue")}</span></div></div>
      </section>

      <section className={classes("feature-section section-wrap calculate-section")} id="calculate">
        <div className={classes("section-copy")} data-reveal><span className={classes("section-label")}>{translate("auth.landing_wage_calculation_2")}</span><h2>{translate("auth.landing_basePay_allowance")}<br /><em>{translate("auth.landing_basis")}</em></h2><p>{translate("auth.landing_hourlyWage_monthlyWage_work")}<br />{translate("auth.landing_confirm_deduction_wage_calculation")}<br />{translate("auth.landing_calculation_item")}</p><div className={classes("allowance-list")}><span>{translate("auth.landing_basePay")}</span><span>{translate("auth.landing_div32")}</span><span>{translate("auth.landing_div33")}</span><span>{translate("auth.landing_div34")}</span><span>{translate("auth.landing_div35")}</span></div><p className={classes("scope-note")}>{translate("auth.landing_calculation_result_applicable_evidence_update_status_confirm")}</p></div>
        <div className={classes("calculation-scene")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><div className={classes("scene-heading")}><span><Calculator aria-hidden="true" size={19}/> {translate("auth.landing_wage_2")}</span><span className={classes("example-label")}>{translate("auth.landing_example_2")}</span></div><PayBreakdown count/><div className={classes("formula-footnote")}><CircleHelp aria-hidden="true" size={16}/><span>{translate("auth.landing_new_netPay")}</span></div></div>
      </section>

      <section className={classes("compare-section")}>
        <div className={classes("section-wrap feature-section reverse")}><div className={classes("comparison-scene")} data-reveal><div className={classes("scene-heading")}><span><Link2 aria-hidden="true" size={19}/> {translate("auth.landing_payslip_deposit_link")}</span><span className={classes("example-label")}>{translate("auth.landing_example_4")}</span></div><ComparePreview /></div><div className={classes("section-copy")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><span className={classes("section-label")}>{translate("auth.landing_payslip_deposit_comparison_2")}</span><h2>{translate("auth.landing_h29")}<br /><em>{translate("auth.landing_h210")}</em></h2><p>{translate("auth.landing_payslip_payment_deduction_sum_confirm")}<br />{translate("auth.landing_netPay_link_deposit_comparison")}<br />{translate("auth.landing_deposit_period_link")}</p><div className={classes("status-legend")}><span><i className={classes("status-match")}/>{translate("auth.landing_record_match")}</span><span><i className={classes("status-diff")}/>{translate("auth.landing_difference")}</span><span><i className={classes("status-missing")}/>{translate("auth.landing_information_insufficient")}</span><span><i className={classes("status-review")}/>{translate("common.reviewRequired")}</span></div></div></div>
      </section>

      <section className={classes("questions-feature section-wrap")}>
        <div data-reveal><span className={classes("section-label")}>{translate("auth.landing_confirm_next")}</span><h2>{translate("auth.landing_question_2")}<br />{translate("auth.landing_required_consultation_record")}</h2><p className={classes("section-description")}>{translate("auth.landing_confirm_company_content")}<br />{translate("auth.landing_required_consultationCenter_record")}</p></div>
        <div className={classes("question-layout")} data-reveal><div className={classes("question-example")}><span className={classes("question-eyebrow")}><MessageCircle aria-hidden="true" size={20}/> {translate("auth.landing_company")}<small>{translate("auth.landing_example_4")}</small></span><p ref={copyRef} tabIndex={-1}>{inquiry}</p><button type="button" className={classes("copy-button")} onClick={copyInquiry}><Copy aria-hidden="true" size={16}/> {translate("auth.landing_example_5")}</button><span className={classes("copy-status")} role="status">{copyStatus}</span></div><div className={classes("next-actions")}><div><Building2 aria-hidden="true"/><strong>{translate("auth.landing_consultationCenter_notice")}</strong><p>{translate("auth.landing_region_unit_consultation_confirm")}</p></div><div><Download aria-hidden="true"/><strong>{translate("auth.landing_consultation_record")}</strong><p>{translate("auth.landing_confirm_result_selected_original")}</p></div></div></div>
      </section>

      <section className={classes("how-section")} id="how-it-works"><div className={classes("section-wrap")}><div data-reveal><span className={classes("section-label")}>{translate("auth.landing_nav2")}</span><h2>{translate("auth.landing_monthlyWage_4")}<br />{translate("auth.landing_h214")}</h2></div><ol className={classes("how-steps")}>{[[translate("auth.landing_record_create"), translate("auth.landing_workplace_period_record")], [translate("auth.landing_confirm_5"), translate("auth.landing_original_confirm_required")], [translate("auth.landing_calculation_comparison"), translate("auth.landing_confirm_scope_amount_difference")], [translate("auth.landing_question_consultation"), translate("auth.landing_question_required_consultation")]].map(([title, copy], i) => <li key={title} data-reveal style={{ '--delay': i * 70 + 'ms' } as MotionStyle}><span className={classes("step-number")}>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{copy}</p>{i < 3 && <ArrowRight aria-hidden="true" size={20}/>}</li>)}</ol></div></section>

      <section className={classes("faq-section section-wrap")} id="questions"><div data-reveal><span className={classes("section-label")}>{translate("auth.landing_question")}</span><h2>{translate("auth.landing_start_2")}<br />{translate("auth.landing_h216")}</h2></div><div className={classes("faq-list")} data-reveal>{[
            [translate("auth.landing_all_record_start_count"), translate("auth.landing_record_confirm_progress_count_contract_empty_wage")],
            [translate("auth.landing_hourlyWage_monthlyWage_count"), translate("auth.landing_hourlyWage_monthlyWage_workingConditions_input_count_calculation_result")],
            [translate("auth.landing_difference_unpaid_2"), translate("auth.landing_current_confirm_record_add_payment_scope_applicable")],
            [translate("auth.landing_record_confirm_start"), translate("auth.landing_signUp_login_workplace_confirm_period_record_create")]
        ].map(([q, a]) => <details key={q}><summary>{q}<Plus aria-hidden="true" size={20}/></summary><p>{a}</p></details>)}</div></section>

      <section className={classes("final-cta")}><div className={classes("section-wrap")} data-reveal><span className={classes("eyebrow")}>{translate("auth.landing_monthlyWage_evidence")}</span><h2>{translate("auth.landing_monthlyWage_start")}<br />{translate("auth.landing_monthlyWage_5")}</h2><Link className={classes("button button-dark")} href="/signup">{translate("auth.landing_monthlyWage_start_2")}<ArrowUpRight aria-hidden="true" size={20}/></Link><p>{translate("auth.landing_account_start")}</p></div></section>
    </main>
    <footer className={classes("site-footer section-wrap")}><div className={classes("footer-top")}><Logo /><a href="#main-content">{translate("auth.landing_a2")}<ArrowUpRight aria-hidden="true" size={16}/></a></div><p>{translate("auth.landing_monthlyWage_work_confirm_wage_record_link")}</p><p className={classes("footer-note")}>{translate("auth.landing_page_document_amount_example_calculation_comparison_result")}<br />{translate("auth.landing_answer_calculation_result_confirm")}</p><span className={classes("copyright")}>{translate("auth.landing_monthlyWage_6")}</span></footer>
  </div>;
}

function createPresentation({translate}: Translation) {
const features = [
    { id: 'gather', number: '01', label: translate("auth.landing_record"), detail: translate("auth.landing_features_detail"), icon: Files },
    { id: 'verify', number: '02', label: translate("auth.landing_original_confirm"), detail: translate("auth.landing_confirm"), icon: ScanLine },
    { id: 'calculate', number: '03', label: translate("auth.landing_wage_calculation"), detail: translate("auth.landing_workingConditions_basis"), icon: Calculator },
    { id: 'compare', number: '04', label: translate("auth.landing_payslip_deposit_comparison"), detail: translate("auth.landing_difference_evidence"), icon: Wallet },
];
const documents = [
    { icon: FileText, name: translate("auth.landing_contract"), file: translate("auth.landing_contract_2"), status: translate("auth.landing_confirm_2"), color: 'violet' },
    { icon: Clock3, name: translate("auth.landing_attendance"), file: translate("auth.landing_attendance_2"), status: translate("auth.landing_time_confirm"), color: 'blue' },
    { icon: FileText, name: translate("auth.landing_payslip"), file: translate("auth.landing_payslip_2"), status: translate("auth.landing_amount_confirm"), color: 'yellow' },
    { icon: Wallet, name: translate("auth.landing_deposit"), file: translate("auth.landing_deposit_case"), status: translate("auth.landing_transaction_link"), color: 'pink' },
];
const inquiry = translate("auth.landing_payslip_netPay_current_confirm_deposit_sum_difference");
return {features, documents, inquiry};
}
