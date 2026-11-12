'use client';
import Link from 'next/link';
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
const features = [
    { id: 'gather', number: '01', label: '자료 모으기', detail: '흩어진 기록을 한곳에', icon: Files },
    { id: 'verify', number: '02', label: '원문 확인', detail: '읽어낸 값은 직접 확인', icon: ScanLine },
    { id: 'calculate', number: '03', label: '임금 계산', detail: '내 근로조건을 기준으로', icon: Calculator },
    { id: 'compare', number: '04', label: '명세서·입금 대조', detail: '차이와 근거를 함께', icon: Wallet },
];
const documents = [
    { icon: FileText, name: '근로계약서', file: '근로계약서.pdf', status: '조건 확인', color: 'violet' },
    { icon: Clock3, name: '근태 기록', file: '6월_근태기록.pdf', status: '시간 확인', color: 'blue' },
    { icon: FileText, name: '급여명세서', file: '6월_급여명세서.pdf', status: '금액 확인', color: 'yellow' },
    { icon: Wallet, name: '입금 기록', file: '7월_입금내역.png', status: '거래 연결', color: 'pink' },
];
const inquiry = '6월 급여명세서의 실수령액은 2,100,000원이고, 현재 확인한 입금 합계는 2,000,000원입니다. 차이 100,000원에 대한 추가 지급 내역이 있는지 확인 부탁드립니다.';
function Logo() {
    return <Link href="/" className={classes("logo")} aria-label="월급잇다 홈"><span className={classes("logo-symbol")} aria-hidden="true"><Link2 aria-hidden="true" size={26} strokeWidth={3}/></span>월급잇다<span className={classes("logo-dot")}>.</span></Link>;
}
function Counter({ value }: {
    value: number;
}) {
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
    return <span ref={ref}><span aria-hidden="true">{number.toLocaleString('ko-KR')}</span><span className={classes("sr-only")}>{value.toLocaleString('ko-KR')}</span></span>;
}
function DocumentRows({ compact = false }) {
    return <div className={classes(compact ? 'document-rows compact' : 'document-rows')}>
    {documents.map(({ icon: Icon, name, file, status, color }, i) => <div className={classes("document-row")} style={{ '--i': i } as MotionStyle} key={name}>
      <span className={classes('file-icon ' + color)}><Icon aria-hidden="true" size={23}/></span><div><strong>{name}</strong><span>{file}</span></div><span className={classes("file-status")}>{status}<Check aria-hidden="true" size={13}/></span>
    </div>)}
  </div>;
}
function PayBreakdown({ count = false }) {
    return <div className={classes("pay-breakdown")}>
    <span className={classes("mini-label")}>공제 전 임금 · 가상 예시</span>
    <div className={classes("pay-total")}>{count ? <Counter value={2200000}/> : '2,200,000'}<small>원</small></div>
    <div className={classes("pay-stack")} aria-hidden="true"><span /><span /><span /><span /></div>
    <dl>{[['기본급', '1,600,000'], ['주휴수당', '320,000'], ['연장근로수당', '180,000'], ['기타 지급 항목', '100,000']].map(([label, value], i) => <div key={label}><dt><span className={classes('pay-dot dot-' + i)}/>{label}</dt><dd>{value}<span>원</span></dd></div>)}</dl>
    <p className={classes("visual-note")}>확인한 조건과 포함 항목에 따라 계산해요.</p>
  </div>;
}
function VerifyPreview() {
    return <div className={classes("verify-preview")}>
    <div className={classes("mini-paper")}><span className={classes("paper-kicker")}>원문 · 1페이지</span><h4>급여명세서</h4><div className={classes("paper-rule")}/><div><span>지급 총액</span><b>2,200,000</b></div><div><span>공제 총액</span><b>100,000</b></div><div className={classes("source-highlight")}><span>실수령액</span><b>2,100,000</b></div><span className={classes("paper-stamp")}>이음 제조 / 2026.06</span></div>
    <span className={classes("source-arrow")}><MoveRight aria-hidden="true" size={22}/></span>
    <div className={classes("verified-fields")}><span className={classes("mini-label")}>읽어낸 값</span><span className={classes("mock-field")}><small>실수령액</small><strong>2,100,000<span>원</span></strong></span><span className={classes("checked-field")}><CheckCircle2 aria-hidden="true" size={16}/> 원문과 직접 확인</span><p>확인한 값만<br />계산에 사용해요.</p></div>
  </div>;
}
function ComparePreview() {
    return <div className={classes("compare-preview")}><div className={classes("compare-pair")}><div><FileText aria-hidden="true" size={24}/><span>명세서 실수령액</span><strong>2,100,000<small>원</small></strong></div><div><Wallet aria-hidden="true" size={24}/><span>연결한 입금 합계</span><strong>2,000,000<small>원</small></strong></div></div><div className={classes("difference-line")}><span>현재 자료에서 확인한 차이</span><strong>100,000원</strong></div><div className={classes("linked-transfers")}><span><Check aria-hidden="true" size={14}/> 7월 10일 · 1,500,000원</span><span><Check aria-hidden="true" size={14}/> 7월 15일 · 500,000원</span></div><p className={classes("visual-note")}>차이가 곧 확정 미지급액을 의미하지는 않아요.</p></div>;
}
function HeroPreview({ active }: {
    active: number;
}) {
    return <div className={classes("product-preview")} aria-label="기능별 가상 화면 예시">
    <div className={classes("preview-toolbar")}><span className={classes("preview-dots")} aria-hidden="true"><i /><i /><i /></span><span>월급잇다</span><span className={classes("example-label")}>화면 예시</span></div>
    <div className={classes("preview-content")} id="landing-preview" aria-live="polite" aria-atomic="true" key={active}>
      <div className={classes("preview-context")}><span><Building2 aria-hidden="true" size={13}/> 이음 제조</span><span>2026년 6월</span></div>
      <h3>{['내 월급의 기록을 모아요.', '원문과 나란히 확인해요.', '받아야 할 임금을 살펴봐요.', '입금까지 이어서 확인해요.'][active]}</h3>
      {active === 0 && <><DocumentRows compact/><div className={classes("preview-bottom")}><span>파일이 없으면 직접 입력해도 괜찮아요.</span><Plus aria-hidden="true" size={18}/></div></>}
      {active === 1 && <VerifyPreview />}
      {active === 2 && <PayBreakdown />}
      {active === 3 && <ComparePreview />}
    </div>
  </div>;
}
export function Landing() {
    const [active, setActive] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [copyStatus, setCopyStatus] = useState('');
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
            setCopyStatus('예시 문장을 복사했어요.');
        }
        catch {
            setCopyStatus('문장을 직접 선택해서 복사해 주세요.');
            copyRef.current?.focus();
        }
    }
    return <div className={styles.landing} ref={rootRef}>
    <header className={classes("site-header")}><div className={classes("header-inner")}><Logo /><nav className={classes(menuOpen ? 'main-nav open' : 'main-nav')} id="main-navigation" aria-label="주 메뉴"><a href="#features" onClick={() => setMenuOpen(false)}>서비스 기능</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>이용 방법</a><a href="#questions" onClick={() => setMenuOpen(false)}>자주 묻는 질문</a></nav><Link className={classes("header-cta")} href="/signup">시작하기<ArrowUpRight aria-hidden="true" size={16}/></Link><button type="button" ref={menuRef} className={classes("menu-toggle")} aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}</button></div></header>
    <main id="main-content" tabIndex={-1}>
      <section className={classes("hero")} aria-labelledby="hero-title">
        <div className={classes("hero-inner")}>
          <div className={classes("hero-copy")} data-reveal>
            <span className={classes("eyebrow")}><span /> 일한 만큼, 이해할 수 있도록</span>
            <h1 id="hero-title">자료는 한곳에.<br />월급은 <em>한눈에.</em></h1>
            <p>계약서부터 마지막 입금까지.<br />흩어진 기록을 연결하고,<br className={classes("desktop-br")}/> 내 월급의 근거를 차근차근 확인하세요.</p>
            <Link className={classes("button button-primary")} href="/login">내 월급 확인하기<ArrowRight aria-hidden="true" size={19}/></Link>
            <span className={classes("cta-caption")}>내 자료로 시작하고, 확인한 근거를 한눈에 살펴보세요.</span>
          </div>
          <div className={classes("hero-product")} data-reveal style={{ '--delay': '140ms' } as MotionStyle}><div className={classes("preview-halo")} aria-hidden="true"/><HeroPreview active={active}/><span className={classes("product-caption")}><ShieldCheck aria-hidden="true" size={15}/> 내 확인에서 시작되는 월급의 근거</span></div>
        </div>
        <div className={classes("feature-switcher")} role="group" aria-label="첫 화면 기능 미리보기">
          {features.map(({ number, label, detail, icon: Icon }, i) => <button type="button" key={number} aria-controls="landing-preview" aria-pressed={active === i} onClick={() => setActive(i)} className={classes('feature-switch ' + (active === i ? 'selected' : ''))}><span className={classes("feature-icon")}><Icon aria-hidden="true" size={24}/></span><span><span className={classes("feature-number")}>{number}</span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight aria-hidden="true" className={classes("feature-arrow")} size={17}/></button>)}
        </div>
        <a className={classes("scroll-cue")} href="#features">내 월급을 확인하는 방법<ArrowDown aria-hidden="true" size={17}/></a>
      </section>

      <div id="features" className={classes("feature-intro section-wrap")} data-reveal><p className={classes("section-label")}>월급잇다로 할 수 있는 일</p><h2>복잡했던 월급 확인,<br />하나씩 연결하면 쉬워져요.</h2></div>

      <section className={classes("feature-section section-wrap gather-section")} id="gather">
        <div className={classes("section-copy")} data-reveal><span className={classes("section-label")}>01 — 자료 모으기</span><h2>흩어진 기록,<br /><em>이제 한곳에.</em></h2><p>계약서, 근태 기록, 명세서와 입금 내역.<br />사업장과 급여 산정기간별로 정리해요.<br />자료가 모두 없어도 시작할 수 있어요.</p><Link href="/login" className={classes("text-action")}>내 자료로 시작하기<ArrowRight aria-hidden="true" size={18}/></Link><div className={classes("support-formats")}><span>PDF</span><span>JPG</span><span>PNG</span><span>직접 입력</span></div><small className={classes("scope-note")}>PDF·JPG·PNG 파일을 지원해요. 파일당 20MiB까지 등록할 수 있어요.</small></div>
        <div className={classes("collection-scene")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><span className={classes("scene-label")}>나의 자료함 · 가상 예시</span><div className={classes("folder-head")}><span><FolderOpen aria-hidden="true" size={24}/><strong>6월의 기록</strong></span><span>이음 제조</span></div><DocumentRows /><div className={classes("collection-footer")}><CheckCheck aria-hidden="true" size={18}/><span>사업장과 기간은 따로, 기록은 함께.</span></div></div>
      </section>

      <section className={classes("verify-section")}>
        <div className={classes("section-wrap feature-section reverse")}><div className={classes("verify-scene")} data-reveal><div className={classes("scene-heading")}><span className={classes("section-label")}>원문 ↔ 확인값</span><span className={classes("example-label")}>화면 예시</span></div><VerifyPreview /><div className={classes("verify-result")}><CheckCircle2 aria-hidden="true" size={20}/><div><strong>이 값이 맞는지, 내가 확인해요.</strong><p>잘못 읽힌 숫자는 고치고, 원본은 그대로 보관해요.</p></div></div></div><div className={classes("section-copy")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><span className={classes("section-label")}>02 — 원문 확인</span><h2>읽어낸 숫자도<br /><em>한 번 더 정확하게.</em></h2><p>금액과 시간, 적용기간을 원문과 함께 확인해요.<br />확인한 값만 다음 계산으로 이어지고,<br />모르는 조건은 나중에 보완할 수 있어요.</p><span className={classes("inline-hint")}><ScanLine aria-hidden="true" size={18}/> 출처부터 확인값까지, 이어서 보기</span></div></div>
      </section>

      <section className={classes("feature-section section-wrap calculate-section")} id="calculate">
        <div className={classes("section-copy")} data-reveal><span className={classes("section-label")}>03 — 임금 계산</span><h2>기본급부터 수당까지.<br /><em>내 조건을 기준으로.</em></h2><p>시급제와 월급제, 서로 다른 근무조건.<br />내가 확인한 조건에 따라 공제 전 임금을 계산해요.<br />계산이 어려운 항목은 이유를 함께 알려드려요.</p><div className={classes("allowance-list")}><span>기본급</span><span>주휴</span><span>연장</span><span>야간</span><span>휴일</span></div><p className={classes("scope-note")}>계산 결과와 함께 적용 조건, 근거와 갱신 상태를 확인하세요.</p></div>
        <div className={classes("calculation-scene")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><div className={classes("scene-heading")}><span><Calculator aria-hidden="true" size={19}/> 6월 임금 살펴보기</span><span className={classes("example-label")}>화면 예시</span></div><PayBreakdown count/><div className={classes("formula-footnote")}><CircleHelp aria-hidden="true" size={16}/><span>세금·보험료를 새로 산정한 실수령액이 아니에요.</span></div></div>
      </section>

      <section className={classes("compare-section")}>
        <div className={classes("section-wrap feature-section reverse")}><div className={classes("comparison-scene")} data-reveal><div className={classes("scene-heading")}><span><Link2 aria-hidden="true" size={19}/> 명세서와 입금 연결</span><span className={classes("example-label")}>가상 예시</span></div><ComparePreview /></div><div className={classes("section-copy")} data-reveal style={{ '--delay': '120ms' } as MotionStyle}><span className={classes("section-label")}>04 — 명세서·입금 대조</span><h2>얼마가 다른지.<br /><em>어디서 다른지.</em></h2><p>명세서의 지급·공제 합계를 확인하고,<br />실수령액과 내가 연결한 입금을 비교해요.<br />나누어 들어온 입금도 같은 기간에 연결해요.</p><div className={classes("status-legend")}><span><i className={classes("status-match")}/>자료상 일치</span><span><i className={classes("status-diff")}/>차이 발견</span><span><i className={classes("status-missing")}/>정보 부족</span><span><i className={classes("status-review")}/>검토 필요</span></div></div></div>
      </section>

      <section className={classes("questions-feature section-wrap")}>
        <div data-reveal><span className={classes("section-label")}>확인 그다음까지</span><h2>궁금한 건 질문으로.<br />필요한 건 상담 자료로.</h2><p className={classes("section-description")}>확인한 사실을 바탕으로 회사에 물어볼 내용을 정리하고,<br />필요하면 상담기관을 찾아 자료를 직접 전달하세요.</p></div>
        <div className={classes("question-layout")} data-reveal><div className={classes("question-example")}><span className={classes("question-eyebrow")}><MessageCircle aria-hidden="true" size={20}/> 회사에 물어볼 문장 <small>가상 예시</small></span><p ref={copyRef} tabIndex={-1}>{inquiry}</p><button type="button" className={classes("copy-button")} onClick={copyInquiry}><Copy aria-hidden="true" size={16}/> 예시 문장 복사</button><span className={classes("copy-status")} role="status">{copyStatus}</span></div><div className={classes("next-actions")}><div><Building2 aria-hidden="true"/><strong>상담기관 안내</strong><p>내 지역과 전국 단위 상담 창구를 확인해요.</p></div><div><Download aria-hidden="true"/><strong>상담 자료 묶음</strong><p>확인한 결과와 선택한 원본을 내려받아 직접 전달해요.</p></div></div></div>
      </section>

      <section className={classes("how-section")} id="how-it-works"><div className={classes("section-wrap")}><div data-reveal><span className={classes("section-label")}>이용 방법</span><h2>내 월급을 알아가는<br />차근차근, 네 걸음.</h2></div><ol className={classes("how-steps")}>{[['자료 등록', '사업장과 기간을 정하고 자료를 모아요.'], ['값·조건 확인', '원문을 확인하고 필요한 조건을 보완해요.'], ['계산·대조', '확인한 범위의 금액과 차이를 살펴봐요.'], ['질문·상담 준비', '질문을 정리하고 필요하면 상담을 준비해요.']].map(([title, copy], i) => <li key={title} data-reveal style={{ '--delay': i * 70 + 'ms' } as MotionStyle}><span className={classes("step-number")}>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{copy}</p>{i < 3 && <ArrowRight aria-hidden="true" size={20}/>}</li>)}</ol></div></section>

      <section className={classes("faq-section section-wrap")} id="questions"><div data-reveal><span className={classes("section-label")}>자주 묻는 질문</span><h2>시작하기 전에,<br />궁금한 것들.</h2></div><div className={classes("faq-list")} data-reveal>{[
            ['모든 자료가 있어야 시작할 수 있나요?', '아니요. 일부 자료만 있어도 가능한 확인부터 진행할 수 있어요. 계약서가 없어 임금 계산이 어려워도 명세서 합계 검사나 입금 대조처럼 가능한 작업은 이어갑니다.'],
            ['시급제와 월급제 모두 이용할 수 있나요?', '시급제와 월급제의 근로조건을 입력할 수 있어요. 실제 근로조건과 지원하는 계산 규칙에 따라 결과를 확인하며, 정보가 부족하거나 계산할 수 없는 항목은 보완이 필요합니다.'],
            ['차이가 나오면 바로 미지급액인가요?', '아니요. 현재 확인한 자료의 값이 다르다는 뜻이에요. 추가 지급 여부, 자료의 범위와 적용 조건을 확인해야 하며, 차액을 확정 미지급액이나 법적 판단으로 표시하지 않습니다.'],
            ['내 자료로 확인하려면 어떻게 시작하나요?', '회원가입 후 로그인하면 근무지를 만들고 확인할 기간과 자료를 등록할 수 있어요. 원문과 추출된 값을 직접 확인한 뒤, 준비된 범위에서 계산 결과와 입금 차이, 질문·상담 자료를 살펴보세요. 이 페이지의 화면과 금액은 모두 가상 예시입니다.']
        ].map(([q, a]) => <details key={q}><summary>{q}<Plus aria-hidden="true" size={20}/></summary><p>{a}</p></details>)}</div></section>

      <section className={classes("final-cta")}><div className={classes("section-wrap")} data-reveal><span className={classes("eyebrow")}>내 일의 기록이, 내 월급의 근거가 되도록.</span><h2>월급을 이해하는 시작,<br />월급잇다.</h2><Link className={classes("button button-dark")} href="/signup">월급잇다 시작하기<ArrowUpRight aria-hidden="true" size={20}/></Link><p>계정을 만들고, 내 기록에서 차근차근 시작하세요.</p></div></section>
    </main>
    <footer className={classes("site-footer section-wrap")}><div className={classes("footer-top")}><Logo /><a href="#main-content">맨 위로<ArrowUpRight aria-hidden="true" size={16}/></a></div><p>월급잇다 · 근로자가 직접 확인하는 급여 자료 연결 서비스</p><p className={classes("footer-note")}>이 페이지의 문서와 금액은 서비스 이해를 위한 가상 예시입니다. 계산·대조 결과는 법적 판단이나 확정 미지급액을 의미하지 않습니다.<br />AI 답변은 참고용이며 공식 계산 결과를 대신하지 않습니다. 누락되거나 확인하지 않은 값은 0으로 간주하지 않습니다.</p><span className={classes("copyright")}>© 2026 월급잇다</span></footer>
  </div>;
}
