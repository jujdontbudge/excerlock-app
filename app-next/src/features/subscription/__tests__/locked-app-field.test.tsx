import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { LockedAppField } from '../LockedAppField';

const phone = { left: 88, width: 226 };

async function tiles(height: number) {
  await render(<LockedAppField width={402} height={height} phone={phone} />);
  return screen.queryAllByTestId(/^locked-app-/, { includeHiddenElements: true });
}

describe('the locked-app wall behind the paywall phone', () => {
  it.each([240, 380, 520, 900])('never shows the same app twice in a %ipt wall', async (height) => {
    const ids = (await tiles(height)).map((tile) => tile.props.testID as string);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tucks the columns beside the phone half behind its edges', async () => {
    const lefts = new Set((await tiles(380)).map((tile) => StyleSheet.flatten(tile.props.style).left as number));
    const { size } = art.paywall.tile;
    expect(lefts).toContain(phone.left - size / 2);
    expect(lefts).toContain(phone.left + phone.width - size / 2);
  });
});
