const numberFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 10 });
export function formatQuantity(value: number | null | undefined, unit?: string | null): string {
 if (value === undefined) return "미제공";
 if (value === null) return "미확정";
 const suffix: Record<string,string> = {COUNT:"개",KRW:"원",MONEY_KRW:"원",KRW_PER_HOUR:"원/시간",MINUTE:"분",MINUTES:"분",MINUTE_COUNT:"분",HOUR:"시간",HOURS:"시간"};
 return `${numberFormat.format(value)}${unit ? ` ${suffix[unit] ?? unit}` : " (단위 미제공)"}`;
}
export function formatDate(value: string | null | undefined): string {
 if(value===undefined)return "미제공";if(value===null)return "미확정";
 // Keep server date and offset: do not shift the documented wage period across time zones.
 return value.replace("T", " ");
}
