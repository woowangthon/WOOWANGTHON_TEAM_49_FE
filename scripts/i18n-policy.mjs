import ts from 'typescript';
import assert from 'node:assert/strict';
import {wireSchemaModules, defaultLocaleOwners} from './i18n-policy.config.mjs';
export function inspectLocaleScope(source, file) {
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),errors=[];
 const report=(n,text)=>errors.push(`${file}:${ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1}: ${text}`);
 const wire=wireSchemaModules.includes(file.replaceAll('\\','/'));
 const defaultOwner=defaultLocaleOwners.includes(file.replaceAll('\\','/'));
 const translators = new Set(['translate', 'translateContent']);
 function discover(n) {
  if (ts.isVariableDeclaration(n) && n.initializer) {
   const call = ts.isAwaitExpression(n.initializer) ? n.initializer.expression : n.initializer;
   if (ts.isCallExpression(call)) {
    const name = call.expression.getText(ast);
    if (['getTranslations', 'useTranslations', 'createTranslator'].includes(name) && ts.isIdentifier(n.name)) translators.add(n.name.text);
    if (['createTranslation', 'useTranslation'].includes(name) && ts.isObjectBindingPattern(n.name)) {
     for (const e of n.name.elements) if (['translate', 'translateContent'].includes(e.propertyName?.getText(ast) ?? e.name.getText(ast))) translators.add(e.name.getText(ast));
    }
   }
  }
  ts.forEachChild(n, discover);
 }
 discover(ast);
 function translationWithin(n){let found=false;function visit(c){if(ts.isCallExpression(c)&&['translate','translateContent'].includes(c.expression.getText(ast)))found=true;ts.forEachChild(c,visit)}visit(n);return found;}
 function insideFunction(n){for(let p=n.parent;p;p=p.parent)if(ts.isFunctionLike(p))return true;return false;}
 function visit(n){
  if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))for(const e of n.importClause.namedBindings.elements){
   const name=e.propertyName?.text??e.name.text;
   if(!e.isTypeOnly&&!n.importClause.isTypeOnly&&/i18n\/translate$/.test(n.moduleSpecifier.text)&&['translate','translateContent','format'].includes(name))report(n,'implicit singleton translator import; inject Translation instead');
   if(name==='defaultLocale'&&!defaultOwner)report(n,'defaultLocale imported into presentation; use the current scope locale');
  }
  if(ts.isCallExpression(n)){
   const name=n.expression.getText(ast);
   if(translators.has(name)&&!insideFunction(n))report(n,'rendered translation at module scope; store a key or use a factory');
   if(name==='createTranslation'&&(!n.arguments.length||(!wire&&ts.isStringLiteral(n.arguments[0]))))report(n,'fixed or implicit locale in translator; supply request/context locale');
   if((/^set[A-Z]/.test(name)||name==='useState')&&translationWithin(n))report(n,'rendered translation stored in state; retain a message descriptor');
   if(ts.isPropertyAccessExpression(n.expression)&&['toLocaleString','toLocaleDateString','toLocaleTimeString'].includes(n.expression.name.text)&&(!n.arguments.length||ts.isStringLiteral(n.arguments[0])))report(n,'formatter must receive the current locale');
  }
  if(ts.isNewExpression(n)&&/^Intl\./.test(n.expression.getText(ast))&&(!n.arguments?.length||ts.isStringLiteral(n.arguments[0])))report(n,'Intl formatter must receive an explicit current locale');
  if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='metadata'&&n.initializer&&ts.isObjectLiteralExpression(n.initializer))for(const p of n.initializer.properties)if(ts.isPropertyAssignment(p)&&['title','description'].includes(p.name.getText(ast).replaceAll(/['"]/g,'')))report(p,'localized metadata must use generateMetadata/getTranslations');
  ts.forEachChild(n,visit);
 }
 visit(ast);return errors;
}
export function verifyPolicyFixtures(){
 const file='src/features/example.tsx';
 for(const source of [
  `const labels={done: translate('common.yes')};`,
  `const {translate:t}=createTranslation(locale); const labels={done:t('common.yes')};`,
  `export const metadata={title:'Account'};`,
  `import {translate} from '@/i18n/translate';`,
  `function Helper(){return new Intl.NumberFormat('ko').format(1);}`,
  `function Component(){setStatus(translate('common.yes'));}`,
 ])assert.ok(inspectLocaleScope(source,file).length,source);
 for(const source of [
  `// 한국어 주석\nfunction build(t){return t('common.yes');}`,
  `function labels(translation){const {translate}=translation;return {yes:translate('common.yes')};}`,
  `const keys={yes:'common.yes'};`,
  `export const metadata={robots:{index:false}};`,
  `function Component(){setStatus(message('common.yes'));}`,
 ])assert.equal(inspectLocaleScope(source,file).length,0,source);
}
if(process.argv.includes('--self-test')){verifyPolicyFixtures();console.log('locale scope policy fixtures passed');}
