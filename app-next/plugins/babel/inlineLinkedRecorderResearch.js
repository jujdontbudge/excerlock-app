module.exports = function inlineLinkedRecorderResearch({ types }) {
  return {
    name: 'inline-linked-recorder-research',
    visitor: {
      Identifier(path, state) {
        if (path.node.name !== '__LINKED_RECORDER_TRACE__' || !path.isReferencedIdentifier()) return;
        path.replaceWith(types.booleanLiteral(state.opts.enabled === true));
      },
    },
  };
};
