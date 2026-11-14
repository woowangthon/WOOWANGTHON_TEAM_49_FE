"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/use-translation";
import styles from "./landing-evidence.module.css";

const arrears = [
  { year: 2024, amount: 1078, label: "landingEvidence.amount2024" },
  { year: 2025, amount: 1548, label: "landingEvidence.amount2025" },
] as const;
const maxArrears = Math.max(...arrears.map(({ amount }) => amount));

export function LandingEvidence() {
  const { translate } = useTranslation();
  const chart = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = chart.current;
    if (!element || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      element.dataset.entered = "true";
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="why" className={styles.section} aria-labelledby="evidence-title">
      <div className={styles.inner}>
        <div className={styles.story}>
          <p className={styles.kicker}>{translate("landingEvidence.problemEyebrow")}</p>
          <h2 id="evidence-title" className={styles.title}>
            {translate("landingEvidence.problemLineOne")}<br />
            <span>{translate("landingEvidence.problemLineTwo")}</span>
          </h2>
          <p className={styles.scope}>{translate("landingEvidence.surveyScope")}</p>
          <dl className={styles.findings}>
            <div>
              <dt>{translate("landingEvidence.meanLabel")}</dt>
              <dd>{translate("landingEvidence.surveyMean")}</dd>
            </div>
            <div>
              <dt>{translate("landingEvidence.barrierNote")}</dt>
              <dd>58.4%</dd>
            </div>
          </dl>
          <details className={styles.details}>
            <summary>{translate("landingEvidence.detailLabel")}<ChevronDown size={16} aria-hidden="true" /></summary>
            <dl>
              <div><dt>{translate("landingEvidence.wagesMissing")}</dt><dd>55.7%</dd></div>
              <div><dt>{translate("landingEvidence.severanceMissing")}</dt><dd>34.3%</dd></div>
            </dl>
          </details>
          <a className={styles.source} href="https://humanrights.go.kr/download/BASIC_ATTACH?storageNo=10004938#page=115">
            {translate("landingEvidence.studySource")}<ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
        <figure className={styles.chart} ref={chart}>
          <figcaption>{translate("landingEvidence.trendTitle")}</figcaption>
          <div className={styles.growth}><strong>+43.6<span>%</span></strong><span>{translate("landingEvidence.changeLabel")}</span></div>
          <div className={styles.plot}>
            {arrears.map(({ year, amount, label }) => (
              <div className={styles.column} key={year}>
                <div className={styles.measure} style={{ "--height": `${amount / maxArrears * 100}%` } as CSSProperties}>
                  <strong>{translate(label)}</strong>
                  <div className={styles.bar} aria-hidden="true" />
                </div>
                <span className={styles.year}>{year}</span>
              </div>
            ))}
          </div>
          <a className={styles.source} href="https://www.yna.co.kr/view/AKR20260908041700054">
            {translate("landingEvidence.trendSource")}<ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </figure>
      </div>
    </section>
  );
}
