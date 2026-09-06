const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Linter} = require('eslint');
const plugin = require('../eslint-a11y.cjs');
function lint(code) {return new Linter().verify(code,[{languageOptions:{parserOptions:{ecmaFeatures:{jsx:true}}},plugins:{a11y:plugin},rules:{'a11y/named-controls':'error'}}]);}
test('native controls cannot silently omit role or label', () => {
 assert.equal(lint('const x = <Pressable onPress={() => {}} />;').length,2);
 assert.equal(lint('const x = <Switch accessibilityLabel="Enable" />;').length,1);
 assert.equal(lint('const x = <Pressable accessibilityRole="button" accessibilityLabel="Next" />;').length,0);
});
