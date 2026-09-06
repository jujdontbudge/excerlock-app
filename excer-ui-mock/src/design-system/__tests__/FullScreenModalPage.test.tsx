import { Text, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { FullScreenModalPage } from '../FullScreenModalPage';
import { space } from '../tokens';

describe('FullScreenModalPage', () => {
  it('keeps choice content at the top while leaving the footer at the bottom', async () => {
    const view = await render(
      <FullScreenModalPage
        contentAlignment="top"
        footer={<Text>Continue</Text>}
      >
        <Text>First option</Text>
      </FullScreenModalPage>,
    );

    const content = view.getByText('First option').parent;
    expect(content).not.toBeNull();
    expect(StyleSheet.flatten(content!.props.style)).toMatchObject({
      justifyContent: 'flex-start',
      paddingTop: space[6],
    });
    expect(view.getByText('Continue')).toBeTruthy();
  });
});
