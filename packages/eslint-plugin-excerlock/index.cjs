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

module.exports = {
  meta: { name: '@excerlock/eslint-plugin' },
  rules: { 'no-comments': noComments },
};
