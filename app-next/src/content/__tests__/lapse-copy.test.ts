import { homeCopy } from '../home';
import { unlockCopy } from '../unlock';

test('a lapse has its own Home copy and is never worded as a rest day', () => {
  expect(homeCopy.lapsed).toBe('Blocking is paused');
  expect(homeCopy.lapsedBody).toBe(
    'Your subscription ended, so your apps are open. Start a plan to switch blocking back on.',
  );
  expect(homeCopy.seePlans).toBe('See plans');
  for (const restDay of [homeCopy.nothingToday, homeCopy.open, homeCopy.paused]) {
    expect(homeCopy.lapsed).not.toBe(restDay);
    expect(homeCopy.lapsedBody).not.toBe(restDay);
  }
});

test('a ceremony finished while lapsed reports the exercise without claiming an unlock', () => {
  expect(unlockCopy.lapsed.title).toBe('Exercise detected');
  expect(unlockCopy.lapsed.body).toBe("Your apps aren't blocked right now");
  for (const claim of [unlockCopy.treadmill.detectedBody, unlockCopy.gym.detectedTime]) {
    expect(unlockCopy.lapsed.body).not.toBe(claim);
  }
  expect(unlockCopy.lapsed.body.toLowerCase()).not.toContain('unlocked');
});
