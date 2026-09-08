import { profileStore } from '../../../state/profileStore';
import { createPostHogAnalytics } from '../postHogAnalytics';
import { personPropertiesOf, startPersonProperties } from '../personProperties';
import { recordingClient } from './recordingClient';

const analytics = () => {
  const client = recordingClient();
  return {
    client,
    port: createPostHogAnalytics(client, { isEnabled: () => true, isAnonymous: () => false }),
  };
};

afterEach(() => profileStore.getState().reset());

test('reads only the four onboarding answers off the profile', () => {
  expect(
    personPropertiesOf({
      ageBand: '25–34',
      occupation: 'Remote worker',
      improveFirst: 'exercise',
      mainReason: 'focus',
      name: 'Alex',
      estimatedDailyMinutes: 180,
      units: 'km',
    }),
  ).toEqual({
    ageBand: '25–34',
    occupation: 'Remote worker',
    improveFirst: 'exercise',
    mainReason: 'focus',
  });
});

test('skips an answer the person never gave', () => {
  expect(personPropertiesOf({ ageBand: '', improveFirst: 'exercise' })).toEqual({
    improveFirst: 'exercise',
  });
});

test('sends the answers once the questionnaire writes them', () => {
  const { client, port } = analytics();
  const stop = startPersonProperties(port);
  profileStore.getState().patch({ ageBand: '25–34', occupation: 'Remote worker' });
  expect(client.signals.filter((signal) => signal.kind === 'person')).toEqual([
    { kind: 'person', props: { ageBand: '25–34', occupation: 'Remote worker', improveFirst: 'exercise' } },
  ]);
  stop();
});

test('does not resend unchanged answers when something else on the profile moves', () => {
  const { client, port } = analytics();
  const stop = startPersonProperties(port);
  profileStore.getState().patch({ ageBand: '25–34' });
  profileStore.getState().patch({ name: 'Alex', estimatedDailyMinutes: 240 });
  expect(client.signals.filter((signal) => signal.kind === 'person')).toHaveLength(1);
  stop();
});

test('a free-text value long enough to be a note never becomes a person property', () => {
  const { client, port } = analytics();
  port.setPersonProperties({ ageBand: 'x'.repeat(200), occupation: 'Remote worker' });
  expect(client.signals.filter((signal) => signal.kind === 'person')).toEqual([
    { kind: 'person', props: { occupation: 'Remote worker' } },
  ]);
});

test('unbinding stops the profile from being followed', () => {
  const { client, port } = analytics();
  startPersonProperties(port)();
  profileStore.getState().patch({ ageBand: '25–34' });
  expect(client.signals.filter((signal) => signal.kind === 'person')).toEqual([]);
});
