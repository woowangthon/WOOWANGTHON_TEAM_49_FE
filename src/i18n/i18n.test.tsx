// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import {catalogs, locales, messageLoaders} from './catalog.generated';
import {languageCatalog} from './config';
import { createTranslation, type MessageKey } from './translate';
const {translate, translateContent, format} = createTranslation('ko');
import {createLocalizedLibFormat} from '@/lib/format';

const {formatQuantity, formatDate} = createLocalizedLibFormat(createTranslation('ko'));
describe('language pack integration', () => {
  it.each(locales)('loads and formats every %s message without ICU errors', async locale => {
    const messages = await messageLoaders[locale]();
    expect(messages).toEqual(catalogs[locale]);
    expect(Object.keys(messages).sort()).toEqual(Object.keys(catalogs.ko).sort());
    const onError = vi.fn();
    const t = createTranslator({locale, messages, onError});
    for (const [ns, catalog] of Object.entries(messages)) {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(catalogs.ko[ns as keyof typeof catalogs.ko]).sort());
      for (const [key, message] of Object.entries(catalog)) {
        const values: Record<string, string | number | Date | (() => string)> = {};
        function argumentsFor(elements: MessageFormatElement[]) {
          for (const element of elements) {
            if (element.type === TYPE.argument) values[element.value] = 'sample';
            else if (element.type === TYPE.number || element.type === TYPE.plural) values[element.value] = 2;
            else if (element.type === TYPE.date || element.type === TYPE.time) values[element.value] = new Date('2026-11-13T12:00:00+09:00');
            else if (element.type === TYPE.select) values[element.value] = 'other';
            else if (element.type === TYPE.tag) { values[element.value] = () => 'rich content'; argumentsFor(element.children); }
            if (element.type === TYPE.select || element.type === TYPE.plural) Object.values(element.options).forEach(option => argumentsFor(option.value));
          }
        }
        argumentsFor(parse(message));
        expect(t.rich(`${ns}.${key}` as MessageKey, values)).toBeDefined();
      }
    }
    expect(onError).not.toHaveBeenCalled();
  });
  it.each(locales)('preserves KRW, zero and missing values in %s', locale => {
    const translation = createTranslation(locale);
    const {formatQuantity} = createLocalizedLibFormat(translation);
    expect(formatQuantity(0, 'KRW')).toContain('0');
    expect(formatQuantity(null, 'KRW')).toBe(translation.translate('common.unconfirmed'));
    expect(formatQuantity(undefined, 'KRW')).toBe(translation.translate('common.notProvided'));
    expect(translation.format.number(2300000, {style:'currency',currency:'KRW'})).toBe(new Intl.NumberFormat(languageCatalog[locale].intlLocale,{style:'currency',currency:'KRW'}).format(2300000));
    render(<p>{translation.translateContent('caseSupport.centersScreen_contact',{value1:<a href="tel:1350">1350</a>})}</p>);
    expect(screen.getByRole('link').getAttribute('href')).toBe('tel:1350');
    cleanup();
  });
  it.each(locales)('supports ICU plural and select branches in %s', locale => {
    const t = createTranslator({locale,messages:{plural:'{count, plural, =0 {none} one {# item} other {# items}}',select:'{state, select, ready {ready} other {pending}}'}});
    expect(t('plural',{count:0})).toBe('none');
    expect(t('plural',{count:2})).toContain('2');
    expect(t('select',{state:'ready'})).toBe('ready');
    expect(t('select',{state:'unknown'})).toBe('pending');
  });
  it('preserves zero, missing values, source dates and source text', () => {
    expect(formatQuantity(0, 'KRW')).toBe('0 원');
    expect(formatQuantity(null, 'KRW')).toBe(translate('common.unconfirmed'));
    expect(formatQuantity(undefined, 'KRW')).toBe(translate('common.notProvided'));
    expect(formatDate('2026-11-13T00:30:00+09:00')).toBe('2026-11-13 00:30:00+09:00');
    expect(format.number(2300000, {style: 'currency', currency: 'KRW'})).toContain('2,300,000');
    expect(translate('dashboard.dashboardScreen_itemCount', {value1: 0})).toBe('0개');
    expect(translate('dashboard.dashboardScreen_itemCount', {value1: 2})).toBe('2개');
  });
  it('preserves interactive elements when translating rich content', () => {
    render(<p>{translateContent('caseSupport.centersScreen_contact', {value1: <a href="tel:1350">1350</a>})}</p>);
    expect(screen.getByRole('link', {name: '1350'}).getAttribute('href')).toBe('tel:1350');
    cleanup();
  });
});
