import {inspectLocaleScope, verifyPolicyFixtures} from './i18n-policy.mjs';
import {excludedDirectories, inspectedMockFiles} from './i18n-policy.config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {parse} from '@formatjs/icu-messageformat-parser';
import {validateLanguagePacks} from './validate-language-packs.mjs';

function files(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
verifyPolicyFixtures();
const errors = validateLanguagePacks();
const messages = new Map();
for (const file of files('src/messages').filter(f => f.endsWith('.json'))) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.parseJsonText(file, source);
  for (const diagnostic of ast.parseDiagnostics) errors.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  const seen = new Set();
  function visit(node) {
    if (ts.isPropertyAssignment(node)) {
      const key = node.name.text;
      if (seen.has(key)) errors.push(`${file}: duplicate key ${key}`);
      seen.add(key);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const [key, value] of Object.entries(JSON.parse(source))) {
    const fullKey = path.basename(file, '.json') + '.' + key;
    if (typeof value !== 'string' || !value.trim()) errors.push(`${fullKey}: empty or non-string message`);
    try { parse(value); } catch (e) { errors.push(`${fullKey}: invalid ICU message (${e.message})`); }
    if (path.basename(path.dirname(file)) === 'ko') messages.set(fullKey, value);
  }
}
const used = new Set();
for (const file of files('src').filter(f => /\.(tsx?|css)$/.test(f) && (!f.includes('.test.') && !excludedDirectories.some(dir => f.replaceAll('\\','/').split('/').includes(dir)) || inspectedMockFiles.includes(f.replaceAll('\\','/'))))) {
  const source = fs.readFileSync(file, 'utf8');
  errors.push(...inspectLocaleScope(source, file.replaceAll('\\','/')));
  if (file.endsWith('.css')) {
    if (/[가-힣]/.test(source.replace(/\/\*[\s\S]*?\*\//g, ''))) errors.push(`${file}: Korean in CSS (use stable data attributes)`);
    continue;
  }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const namespaces = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const call = ts.isAwaitExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (ts.isCallExpression(call) && ['getTranslations', 'useTranslations'].includes(call.expression.getText(ast)) && (!call.arguments[0] || ts.isStringLiteral(call.arguments[0]))) namespaces.set(node.name.getText(ast), call.arguments[0]?.text ?? '');
    }
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(ast);
      if (['translate', 'translateContent', 'message', 'describeMessage'].includes(name) || namespaces.has(name)) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          const prefix = namespaces.get(name);
          const key = prefix ? prefix + '.' + arg.text : arg.text;
          if (!messages.has(key)) errors.push(`${file}: unknown message ${key}`);
          used.add(key);
        }
      }
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) {
      const text = node.text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
      if (messages.has(text)) used.add(text);
      let debugLog = false;
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isCallExpression(parent) && parent.expression.getText(ast) === 'console.debug') debugLog = true;
      }
      // Native language names are intentionally stable across display languages.
      const nativeLanguageName = file.replaceAll('\\', '/') === 'src/i18n/config.ts' && text === '\uD55C\uAD6D\uC5B4';
      if (!debugLog && !nativeLanguageName && /[가-힣]/.test(text)) errors.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: hardcoded Korean`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
for (const key of messages.keys()) if (!used.has(key)) errors.push(`unused message: ${key}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`i18n: ${messages.size} messages validated; no duplicates, invalid ICU, unknown/unused keys or hardcoded Korean.`);
