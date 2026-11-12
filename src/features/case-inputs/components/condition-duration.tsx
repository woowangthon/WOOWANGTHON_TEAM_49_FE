"use client";
import { translate, translateContent } from "@/i18n/translate";


import { useState, type Ref } from "react";
import styles from "./conditions-screen.module.css";

export function ConditionDuration({ id, value, onChange, onBlur, inputRef, disabled, error }: {
  id: string; value: string; onChange: (value: string) => void; onBlur: () => void;
  inputRef: Ref<HTMLInputElement>; disabled: boolean; error?: string;
}) {
  const numeric = /^\d+$/.test(value);
  const [parts, setParts] = useState({ hours: numeric ? String(Math.floor(Number(value) / 60)) : "", minutes: numeric ? String(Number(value) % 60) : "" });
  function change(key: "hours" | "minutes", text: string) {
    const next = { ...parts, [key]: text }; setParts(next);
    if (next.hours === "" && next.minutes === "") { onChange(""); return; }
    const hours = Number(next.hours || "0"), minutes = Number(next.minutes || "0");
    const valid = Object.values(next).every(part => part === "" || /^\d+$/.test(part)) && Number.isSafeInteger(hours) && Number.isSafeInteger(minutes) && minutes < 60 && hours * 60 + minutes <= 1_000_000;
    onChange(valid ? String(hours * 60 + minutes) : "INVALID_DURATION");
  }
  return <div className={styles.duration}>
    <div className={styles.timeFields}>
      <label htmlFor={`${id}-hours`}>{translate("common.hourUnit")}<input ref={inputRef} id={`${id}-hours`} aria-label={translate("caseInputs.conditionDuration_work_time")} type="text" inputMode="numeric" value={parts.hours} maxLength={8} disabled={disabled} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} onBlur={onBlur} onChange={event => change("hours", event.target.value)} /></label>
      <label htmlFor={`${id}-minutes`}>{translate("common.minuteUnit")}<input id={`${id}-minutes`} aria-label={translate("caseInputs.conditionDuration_work_time_minutes")} type="text" inputMode="numeric" value={parts.minutes} maxLength={8} disabled={disabled} aria-invalid={!!error} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} onBlur={onBlur} onChange={event => change("minutes", event.target.value)} /></label>
    </div>
    <p id={`${id}-hint`} className={styles.hint}>{translate("caseInputs.conditionDuration_input_processing_unanswered")}</p>
    <button type="button" className={styles.unknown} disabled={disabled} aria-pressed={value === "UNKNOWN"} onClick={() => { setParts({ hours: "", minutes: "" }); onChange("UNKNOWN"); }}>{translateContent("caseInputs.conditionDuration_div2", { value1: value === "UNKNOWN" && <span aria-hidden="true">{translate("caseInputs.conditionDuration_select")}</span> })}</button>
    {error && <p id={`${id}-error`} role="alert" className={styles.error}>{error}</p>}
  </div>;
}
