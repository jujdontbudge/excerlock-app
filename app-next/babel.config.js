const { researchEnabled } = require('./plugins/linkedRecorderResearchConfig');

module.exports = function babelConfig(api) {
  const linkedRecorderResearch = researchEnabled(process.env);
  api.cache.using(() => linkedRecorderResearch);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [require.resolve('./plugins/babel/inlineLinkedRecorderResearch'), { enabled: linkedRecorderResearch }],
    ],
  };
};
