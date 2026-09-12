module.exports = function babelConfig(api) {
  const linkedRecorderResearch = process.env.EXCERLOCK_LINKED_RECORDER_TRACE === '1';
  api.cache.using(() => linkedRecorderResearch);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [require.resolve('./plugins/babel/inlineLinkedRecorderResearch'), { enabled: linkedRecorderResearch }],
    ],
  };
};
