const ALLOWED_DIRECTIVES = [
  /^\s*eslint-(disable|enable)(-next-line|-line)?\s[\s\S]*\s--\s+\S/,
  /^\s*@ts-expect-error\s+\S/,
  /^\/\s*<reference\s/,
  /^\s*@refresh\s/,
];

const isAllowedDirective = (comment) =>
  ALLOWED_DIRECTIVES.some((pattern) => pattern.test(comment.value));

const isWordChar = (char) => char !== undefined && /[\w$]/.test(char);
const isInlineSpace = (char) => char === ' ' || char === '\t';
const isLineEnd = (text, index) =>
  index >= text.length || text[index] === '\n' || text[index] === '\r';

const emptyJsxContainer = (sourceCode, comment) => {
  const found = sourceCode.getNodeByRangeIndex(comment.range[0]);
  const node = found && found.type === 'JSXEmptyExpression' ? found.parent : found;
  if (!node || node.type !== 'JSXExpressionContainer') return null;
  if (node.expression.type !== 'JSXEmptyExpression') return null;
  const inner = sourceCode.getCommentsInside(node);
  return inner.length > 0 && inner[0] === comment ? node : null;
};

const removalFix = (sourceCode, start, end) => (fixer) => {
  const text = sourceCode.text;
  let lineStart = start;
  while (lineStart > 0 && isInlineSpace(text[lineStart - 1])) lineStart -= 1;
  let lineEnd = end;
  while (lineEnd < text.length && isInlineSpace(text[lineEnd])) lineEnd += 1;
  const startsLine = lineStart === 0 || text[lineStart - 1] === '\n';
  if (startsLine && isLineEnd(text, lineEnd)) {
    let cut = lineEnd;
    if (text[cut] === '\r') cut += 1;
    if (text[cut] === '\n') cut += 1;
    return fixer.removeRange([lineStart, cut]);
  }
  if (isLineEnd(text, lineEnd)) return fixer.removeRange([lineStart, end]);
  if (isWordChar(text[start - 1]) && isWordChar(text[end])) {
    return fixer.replaceTextRange([start, end], ' ');
  }
  if (isInlineSpace(text[start - 1]) && isInlineSpace(text[end])) {
    return fixer.removeRange([start, end + 1]);
  }
  return fixer.removeRange([start, end]);
};

const noComments = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      noComments:
        'Comments are not allowed. Put the knowledge in a name, a type, CONTEXT.md or an ADR.',
      needsReason:
        'Directive comments must state a reason: `eslint-disable-next-line rule -- reason` or `@ts-expect-error reason`.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type === 'Shebang' || isAllowedDirective(comment)) continue;
          if (/^\s*(eslint-|@ts-)/.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'needsReason' });
            continue;
          }
          const container = emptyJsxContainer(sourceCode, comment);
          const [start, end] = container ? container.range : comment.range;
          context.report({
            loc: comment.loc,
            messageId: 'noComments',
            fix: removalFix(sourceCode, start, end),
          });
        }
      },
    };
  },
};

const ERROR_NAMES = new Set(['e', 'err', 'error', 'caught']);
const STATUS_COPY = /^[A-Z][a-z]+ing\b[^…]*…$/;

const noStatusText = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      alert: 'Screens never show inline alert text. Call notify() from ui/Notice for the one calm message.',
      spinner: 'Screens never show a spinner. Keep the screen still and pass `loading` to the button.',
      errorColor: 'Screens never show red error text. Use notify() from ui/Notice.',
      rawError: 'Never show an error message to the user. Report it and call notify() with plain copy.',
      statusCopy: 'Never show "…ing…" status copy. The work should just happen.',
    },
  },
  create(context) {
    const filename = context.filename.replace(/\\/g, '/');
    const inUi = filename.includes('/src/packages/ui/');
    return {
      JSXAttribute(node) {
        if (
          node.name.name === 'accessibilityRole' &&
          node.value &&
          node.value.type === 'Literal' &&
          node.value.value === 'alert'
        )
          context.report({ node, messageId: 'alert' });
      },
      JSXOpeningElement(node) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'ActivityIndicator')
          context.report({ node, messageId: 'spinner' });
      },
      MemberExpression(node) {
        if (
          !inUi &&
          node.property.type === 'Identifier' &&
          node.property.name === 'error' &&
          node.object.type === 'MemberExpression' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'state'
        )
          context.report({ node, messageId: 'errorColor' });
        if (
          filename.endsWith('.tsx') &&
          node.property.type === 'Identifier' &&
          node.property.name === 'message' &&
          node.object.type === 'Identifier' &&
          ERROR_NAMES.has(node.object.name)
        )
          context.report({ node, messageId: 'rawError' });
      },
      Literal(node) {
        if (typeof node.value === 'string' && STATUS_COPY.test(node.value) && !(filename.endsWith('/unlock/lib/unlockCopy.ts') && node.value === 'Getting a better fix…'))
          context.report({ node, messageId: 'statusCopy' });
      },
    };
  },
};

const TEXT_ELEMENTS = /^(Label|Text|NativeText|TextInput|Animated\.Text|Animated\.TextInput)$/;
const ONE_SIDED_MARGINS = new Set(['marginTop', 'marginBottom']);
const ONE_SIDED_PADDING = new Set(['paddingTop', 'paddingBottom']);

const elementName = (name) =>
  name.type === 'JSXIdentifier' ? name.name : name.type === 'JSXMemberExpression' ? `${elementName(name.object)}.${name.property.name}` : '';

const keyName = (property) =>
  property.type === 'Property' && !property.computed
    ? property.key.type === 'Identifier' ? property.key.name : String(property.key.value)
    : null;

const noTextNudge = {
  meta: {
    type: 'problem',
    docs: { description: 'Text sits centred by the font metrics in Label; hand-tuned offsets on text drift off centre.' },
    schema: [],
    messages: {
      nudge:
        'Do not nudge text with `{{key}}`. Label already centres the capital letters in its line box from the font metrics (capShift), so centre the container instead. Allowed: a translateY computed by capShift or useCapShift, percentage translateX to pin a label to a point, and symmetric marginVertical to trim a tall line box.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    const sheets = new Map();
    const pending = [];
    const fromCapShift = (expression, node) => {
      let found = false;
      const visit = (value, depth) => {
        if (!value || found || depth > 4) return;
        if (value.type === 'CallExpression' && value.callee.type === 'Identifier' && /^(use)?[cC]apShift$/.test(value.callee.name)) {
          found = true;
          return;
        }
        if (value.type === 'Identifier') {
          let scope = source.getScope(node);
          while (scope) {
            const variable = scope.set.get(value.name);
            if (variable) {
              const definition = variable.defs[0];
              if (definition && definition.node.type === 'VariableDeclarator') visit(definition.node.init, depth + 1);
              return;
            }
            scope = scope.upper;
          }
          return;
        }
        for (const key of ['left', 'right', 'argument', 'expression', 'consequent', 'alternate', 'callee', 'object']) visit(value[key], depth);
        if (value.arguments) value.arguments.forEach((argument) => visit(argument, depth));
      };
      visit(expression, 0);
      return found;
    };
    const percentages = (value) =>
      value.type === 'Literal' ? typeof value.value === 'string' && /^-?\d+(\.\d+)?%$/.test(value.value)
        : value.type === 'ConditionalExpression' && percentages(value.consequent) && percentages(value.alternate);
    const negative = (value) =>
      value.type === 'UnaryExpression' && value.operator === '-' ||
      value.type === 'Literal' && typeof value.value === 'number' && value.value < 0;
    const inspectObject = (object, node) => {
      const absolute = object.properties.some((property) => keyName(property) === 'position' && property.value.type === 'Literal' && property.value.value === 'absolute');
      for (const property of object.properties) {
        const key = keyName(property);
        if (!key) continue;
        const value = property.value;
        let bad = false;
        if (key === 'transform')
          bad = !(value.type === 'ArrayExpression' && value.elements.every((item) =>
            item && item.type === 'ObjectExpression' && item.properties.every((entry) =>
              (keyName(entry) === 'translateY' && fromCapShift(entry.value, node)) || (keyName(entry) === 'translateX' && percentages(entry.value)))));
        else if ((key === 'top' || key === 'bottom') && !absolute) bad = true;
        else if (ONE_SIDED_MARGINS.has(key) && negative(value)) bad = true;
        else if (ONE_SIDED_PADDING.has(key)) bad = true;
        if (bad) context.report({ node: property, messageId: 'nudge', data: { key } });
      }
    };
    const inspect = (expression, node) => {
      if (!expression) return;
      if (expression.type === 'ObjectExpression') inspectObject(expression, node);
      else if (expression.type === 'ArrayExpression') expression.elements.forEach((element) => inspect(element, node));
      else if (expression.type === 'ConditionalExpression') { inspect(expression.consequent, node); inspect(expression.alternate, node); }
      else if (expression.type === 'LogicalExpression') inspect(expression.right, node);
      else if (expression.type === 'MemberExpression' && expression.object.type === 'Identifier' && !expression.computed) {
        const sheet = sheets.get(expression.object.name);
        const entry = sheet && sheet.properties.find((property) => keyName(property) === expression.property.name);
        if (entry && entry.value.type === 'ObjectExpression') inspectObject(entry.value, node);
      }
    };
    return {
      VariableDeclarator(node) {
        const init = node.init;
        if (
          node.id.type === 'Identifier' && init && init.type === 'CallExpression' &&
          init.callee.type === 'MemberExpression' && init.callee.object.type === 'Identifier' && init.callee.object.name === 'StyleSheet' &&
          init.callee.property.type === 'Identifier' && init.callee.property.name === 'create' &&
          init.arguments[0] && init.arguments[0].type === 'ObjectExpression'
        )
          sheets.set(node.id.name, init.arguments[0]);
      },
      'Program:exit'() {
        for (const element of pending) {
          const style = element.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'style');
          if (style && style.value && style.value.type === 'JSXExpressionContainer') inspect(style.value.expression, element);
        }
      },
      JSXOpeningElement(node) {
        if (TEXT_ELEMENTS.test(elementName(node.name))) pending.push(node);
      },
    };
  },
};

const typeToken = (expression) =>
  !!expression && expression.type === 'MemberExpression' && expression.object.type === 'MemberExpression' &&
  !expression.object.computed && expression.object.property.type === 'Identifier' && expression.object.property.name === 'type' &&
  expression.object.object.type === 'Identifier' && /^(t|tokens)$/.test(expression.object.object.name);

const noRawInputType = {
  meta: {
    type: 'problem',
    docs: { description: 'A TextInput styled with a type token line height draws its text far above centre on iOS.' },
    schema: [],
    messages: {
      raw:
        'TextInput does not centre text the way Label does: with a type token\'s lineHeight, iOS pins single-line input text far above centre. Style it with useInputType(variant) from ui/Label, or use TextField.',
    },
  },
  create(context) {
    const inputs = new Set(['TextInput', 'Animated.TextInput']);
    const elements = [];
    const objects = (expression, out) => {
      if (!expression) return out;
      if (expression.type === 'ObjectExpression') out.push(expression);
      else if (expression.type === 'ArrayExpression') expression.elements.forEach((element) => objects(element, out));
      else if (expression.type === 'ConditionalExpression') { objects(expression.consequent, out); objects(expression.alternate, out); }
      else if (expression.type === 'LogicalExpression') objects(expression.right, out);
      return out;
    };
    const tokens = (expression) => {
      if (!expression) return false;
      if (typeToken(expression)) return true;
      if (expression.type === 'ArrayExpression') return expression.elements.some(tokens);
      if (expression.type === 'ConditionalExpression') return tokens(expression.consequent) || tokens(expression.alternate);
      if (expression.type === 'LogicalExpression') return tokens(expression.right);
      if (expression.type === 'ObjectExpression') return expression.properties.some((property) => property.type === 'SpreadElement' && typeToken(property.argument));
      return false;
    };
    const clears = (expression) =>
      objects(expression, []).some((object) => object.properties.some((property) =>
        keyName(property) === 'lineHeight' && property.value.type === 'Identifier' && property.value.name === 'undefined'));
    return {
      VariableDeclarator(node) {
        const init = node.init;
        if (node.id.type !== 'Identifier' || !init || init.type !== 'CallExpression') return;
        const callee = init.callee;
        const name = callee.type === 'Identifier' ? callee.name : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name : '';
        const target = init.arguments[0];
        if (name === 'createAnimatedComponent' && target && target.type === 'Identifier' && target.name === 'TextInput') inputs.add(node.id.name);
      },
      JSXOpeningElement(node) {
        elements.push(node);
      },
      'Program:exit'() {
        for (const element of elements) {
          if (!inputs.has(elementName(element.name))) continue;
          const multiline = element.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'multiline');
          if (multiline && (!multiline.value || (multiline.value.type === 'JSXExpressionContainer' && multiline.value.expression.type === 'Literal' && multiline.value.expression.value === true))) continue;
          const style = element.attributes.find((attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'style');
          if (!style || !style.value || style.value.type !== 'JSXExpressionContainer') continue;
          if (tokens(style.value.expression) && !clears(style.value.expression)) context.report({ node: style, messageId: 'raw' });
        }
      },
    };
  },
};

module.exports = {
  meta: { name: '@excerlock/eslint-plugin' },
  rules: { 'no-comments': noComments, 'no-status-text': noStatusText, 'no-text-nudge': noTextNudge, 'no-raw-input-type': noRawInputType },
};
