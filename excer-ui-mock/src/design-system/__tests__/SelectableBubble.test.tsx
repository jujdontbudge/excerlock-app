import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SelectableBubble } from '../SelectableBubble';
import { colors, layout, radius } from '../tokens';

describe('SelectableBubble', () => {
  it('smoothly inverts from white copy to a white surface with blue copy', async () => {
    const onPress = jest.fn();
    const view = await render(
      <SelectableBubble label="Beginner" onPress={onPress} role="radio" selected={false} />,
    );

    expect(view.getByRole('radio', { name: 'Beginner' }).props.accessibilityState).toMatchObject({
      checked: false,
      selected: false,
    });
    expect(StyleSheet.flatten(view.getByText('Beginner').props.style)).toMatchObject({
      color: colors.text.primary,
      transitionProperty: 'color',
    });

    await view.rerender(
      <SelectableBubble label="Beginner" onPress={onPress} role="radio" selected />,
    );

    expect(view.getByRole('radio', { name: 'Beginner, selected' }).props.accessibilityState).toMatchObject({
      checked: true,
      selected: true,
    });
    expect(StyleSheet.flatten(view.getByText('Beginner').props.style)).toMatchObject({
      color: colors.brand.primary,
      transitionProperty: 'color',
    });
  });

  it('keeps compact and full-size options on the same rounded-rectangle geometry', async () => {
    const view = await render(
      <SelectableBubble compact label="Intermediate" onPress={() => undefined} selected={false} />,
    );

    const pressable = view.getByRole('button', { name: 'Intermediate' });
    const animatedSurface = pressable.children[0];
    if (typeof animatedSurface === 'string') {
      throw new Error('Expected a rendered option surface.');
    }
    expect(StyleSheet.flatten(animatedSurface.props.style)).toMatchObject({
      borderRadius: radius.control,
      minHeight: layout.controlHeightCompact,
    });
  });
});
