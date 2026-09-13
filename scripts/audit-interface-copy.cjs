const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const messages = new Map();
function template(node, source) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { value: node.text, expressions: [] };
  if (!ts.isTemplateExpression(node)) return null;
  return { value: node.head.text + node.templateSpans.map((span, i) => `{${i}}${span.literal.text}`).join(''), expressions: node.templateSpans.map(span => span.expression.getText(source)) };
}
function collect(frNode, enNode, source, file) {
  const fr = template(frNode, source), en = template(enNode, source);
  if (!fr || !en || !en.value || en.value.startsWith('/') || /^[a-z]{2}[-_][A-Z]{2}$/.test(en.value)) return;
  const existing = messages.get(en.value);
  if (existing) { existing.files.add(file); return; }
  messages.set(en.value, { en: en.value, fr: fr.value, expressions: en.expressions, files: new Set([file]) });
}
function objectPairs(fr, en, source, file) {
  const resolve = node => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return resolve(node.expression);
    if (ts.isIdentifier(node)) {
      let value;
      function find(n) { if (ts.isVariableDeclaration(n) && n.name.getText(source) === node.text && n.initializer) value = n.initializer; else ts.forEachChild(n, find); }
      find(source);
      if (value && value !== node) return resolve(value);
    }
    return node;
  };
  fr = resolve(fr); en = resolve(en);
  if (ts.isConditionalExpression(en)) { objectPairs(ts.isConditionalExpression(fr) ? fr.whenTrue : fr, en.whenTrue, source, file); objectPairs(ts.isConditionalExpression(fr) ? fr.whenFalse : fr, en.whenFalse, source, file); return; }
  if (ts.isArrayLiteralExpression(fr) && ts.isArrayLiteralExpression(en)) {
    en.elements.forEach((element, i) => { if (fr.elements[i]) objectPairs(fr.elements[i], element, source, file); }); return;
  }
  if (ts.isArrowFunction(fr) && ts.isArrowFunction(en)) { objectPairs(fr.body, en.body, source, file); return; }
  if (!ts.isObjectLiteralExpression(fr) || !ts.isObjectLiteralExpression(en)) { collect(fr, en, source, file); return; }
  for (const ep of en.properties) {
    if (!ts.isPropertyAssignment(ep)) continue;
    const fp = fr.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(source) === ep.name.getText(source));
    if (fp) objectPairs(fp.initializer, ep.initializer, source, file);
  }
}
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) { if (!['__tests__', '__snapshots__'].includes(item.name)) walk(file); continue; }
    if (!/\.tsx?$/.test(file) || /(?:checkout-copy|auth-errors-copy|pwa-copy|localized-tour)\.ts$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments.length === 2) objectPairs(node.arguments[0], node.arguments[1], source, file);
      if (ts.isCallExpression(node) && ['translate', 'localizeValue'].includes(node.expression.getText(source)) && node.arguments.length === 3) objectPairs(node.arguments[1], node.arguments[2], source, file);
      if (ts.isConditionalExpression(node)) {
        const condition = node.condition.getText(source);
        if (/^(?:locale|lang|player.locale) === ['"]en['"]$/.test(condition)) objectPairs(node.whenFalse, node.whenTrue, source, file);
        if (/^(?:locale|lang|player.locale) === ['"]fr['"]$/.test(condition)) objectPairs(node.whenTrue, node.whenFalse, source, file);
      }
      if (ts.isObjectLiteralExpression(node)) {
        const prop = key => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(source).replace(/['"]/g, '') === key);
        const fr = prop('fr'), en = prop('en');
        if (fr && en) objectPairs(fr.initializer, en.initializer, source, file);
        for (const key of ['label', 'badge']) {
          const first = prop(key), second = prop(`${key}En`);
          if (first && second) objectPairs(first.initializer, second.initializer, source, file);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
walk('src');
const result = [...messages.values()].map(v => ({ ...v, files: [...v.files] })).sort((a, b) => a.en.localeCompare(b.en, 'en'));
const current = fs.existsSync('src/lib/i18n/interface-copy.json') ? JSON.parse(fs.readFileSync('src/lib/i18n/interface-copy.json', 'utf8')) : {};
fs.writeFileSync('.interface-copy-additional.json', JSON.stringify(result.filter(message => !(message.en in current)), null, 2));
console.log(JSON.stringify({ messages: result.length, words: result.reduce((n, v) => n + v.en.split(/\s+/).length, 0) }));
