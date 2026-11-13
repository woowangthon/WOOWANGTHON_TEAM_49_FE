import fs from 'node:fs';
import {parse, TYPE} from '@formatjs/icu-messageformat-parser';

// Compare semantic ICU arguments and rich tags, not translated literal text or
// plural categories (which legitimately differ between languages).
export function signature(message) {
  const result = new Set();
  function visit(elements) {
    for (const e of elements) {
      if (e.type !== TYPE.literal && e.type !== TYPE.pound) result.add(`${e.type}:${e.value}`);
      if (e.type === TYPE.tag) visit(e.children);
      if (e.type === TYPE.select || e.type === TYPE.plural) {
        if (!e.options.other) throw new Error('Missing other branch');
        if (e.type === TYPE.select) result.add(`select:${Object.keys(e.options).sort().join(',')}`);
        Object.values(e.options).forEach(o => visit(o.value));
      }
    }
  }
  visit(parse(message));
  return JSON.stringify([...result].sort());
}
export function validateLanguagePacks() {
  const root = 'src/messages';
  const errors = [];
  const baseline = fs.readdirSync(`${root}/ko`).filter(f => f.endsWith('.json')).sort();
  for (const locale of fs.readdirSync(root).filter(f => fs.statSync(`${root}/${f}`).isDirectory())) {
    const names = fs.readdirSync(`${root}/${locale}`).filter(f => f.endsWith('.json')).sort();
    if (JSON.stringify(names) !== JSON.stringify(baseline)) errors.push(`${locale}: namespace mismatch`);
    for (const name of names) {
      const expected = JSON.parse(fs.readFileSync(`${root}/ko/${name}`, 'utf8'));
      const actual = JSON.parse(fs.readFileSync(`${root}/${locale}/${name}`, 'utf8'));
      if (JSON.stringify(Object.keys(expected).sort()) !== JSON.stringify(Object.keys(actual).sort())) errors.push(`${locale}/${name}: key mismatch`);
      for (const [key, value] of Object.entries(actual)) {
        try {
          if (signature(value) !== signature(expected[key])) errors.push(`${locale}/${name}/${key}: ICU argument/tag mismatch`);
          if (locale !== 'ko' && /[가-힣]/u.test(value)) errors.push(`${locale}/${name}/${key}: untranslated Korean`);
        } catch (e) { errors.push(`${locale}/${name}/${key}: ${e.message}`); }
      }
    }
  }
  return errors;
}
