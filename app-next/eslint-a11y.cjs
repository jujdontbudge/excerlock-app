/** Native controls own explicit semantics; composite controls own typed label props. */
module.exports = {
  rules: {
    'named-controls': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        return {
          JSXOpeningElement(node) {
            const name = node.name.name;
            if (!['Pressable', 'Switch', 'TouchableOpacity', 'TouchableHighlight'].includes(name)) return;
            const attrs = new Set(node.attributes.filter((a) => a.type === 'JSXAttribute').map((a) => a.name.name));
            for (const required of ['accessibilityRole', 'accessibilityLabel']) {
              if (!attrs.has(required)) context.report({ node, message: `${name} requires explicit ${required}.` });
            }
          },
        };
      },
    },
  },
};
