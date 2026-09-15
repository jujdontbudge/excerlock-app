// Lab-only link identity, kept in a module that the research JavaScript bundle
// is allowed to import. `linkedRecorderResearchConfig.js` re-exports these and
// owns the build-time opt-in; it also names the dev-client modules that must
// stay out of a standalone build, so the app must not import that file.
const URL_SCHEME = 'excerlock-linked-trace';
// Trace Lab starts a test and opens the co-installed Walking Recorder through
// this lab-only scheme. The recorder registers it and nothing else, so no
// production link can drive it. The recorder returns through URL_SCHEME.
const WALKING_RECORDER_SCHEME = 'excerlock-walkingrecorder';
const WALKING_RECORDER_LINK_HOSTS = Object.freeze({
  linkedSession: 'linked-session',
  shareArchive: 'share-archive',
});

module.exports = { URL_SCHEME, WALKING_RECORDER_SCHEME, WALKING_RECORDER_LINK_HOSTS };
