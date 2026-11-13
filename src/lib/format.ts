import {type Translation} from '@/i18n/translate';
import {languageCatalog} from '@/i18n/config';

export function createLocalizedLibFormat(translation: Translation) {
  const {translate, locale: defaultLocale} = translation;
const numberFormat = new Intl.NumberFormat(languageCatalog[defaultLocale].intlLocale, { maximumFractionDigits: 10 });
function formatQuantity(value: number | null | undefined, unit?: string | null): string {
 if (value === undefined) return translate("common.notProvided");
 if (value === null) return translate("common.unconfirmed");
 const suffix: Record<string,string> = {COUNT:translate("common.countUnit"),KRW:translate("common.won"),MONEY_KRW:translate("common.won"),KRW_PER_HOUR:translate("common.format_time"),MINUTE:translate("common.minuteUnit"),MINUTES:translate("common.minuteUnit"),MINUTE_COUNT:translate("common.minuteUnit"),HOUR:translate("common.hourUnit"),HOURS:translate("common.hourUnit")};
 return `${numberFormat.format(value)}${unit ? ` ${suffix[unit] ?? unit}` : translate("common.format_unit_notProvided")}`;
}
function formatDate(value: string | null | undefined): string {
 if(value===undefined)return translate("common.notProvided");if(value===null)return translate("common.unconfirmed");
 // Keep server date and offset: do not shift the documented wage period across time zones.
 return value.replace("T", " ");
}
return {formatQuantity, formatDate};
}
