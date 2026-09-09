import { render } from '@testing-library/react-native';
import { processColor, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomTabBar } from '../BottomTabBar';
import {
  CONTENT_FADE_COLORS,
  CONTENT_FADE_PROGRESS,
  ContentFadeMask,
} from '../ContentFadeMask';
import {
  CONTENT_FADE_LENGTH,
  CONTENT_FADE_STOPS,
  DOCK_BAR_HEIGHT,
  getContentFadeAlpha,
  getContentFadeGeometry,
  getContentHiddenHeight,
} from '../dockGeometry';
import { gradients, layout } from '../tokens';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

describe('BottomTabBar', () => {
  it('renders VTracer vector assets as accessible tabs with visible labels', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <BottomTabBar
          activeKey="home"
          items={[
            { icon: 'home', key: 'home', label: 'Home' },
            { icon: 'analysis', key: 'analysis', label: 'Analysis' },
          ]}
          onSelect={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(view.getByTestId('bottom-tab-bar')).toBeTruthy();
    expect(view.getByLabelText('Home')).toBeTruthy();
    expect(view.getByLabelText('Analysis')).toBeTruthy();
    expect(view.getByText('Home')).toBeTruthy();
    expect(view.getByText('Analysis')).toBeTruthy();

    const homeIcon = view.getByTestId('bottom-tab-icon-home', { includeHiddenElements: true });
    const analysisIcon = view.getByTestId('bottom-tab-icon-analysis', { includeHiddenElements: true });
    expect(homeIcon.type).toBe('View');
    expect(analysisIcon.type).toBe('View');
    expect(view.queryByTestId('bottom-screen-fade')).toBeNull();

    const dockStyle = StyleSheet.flatten(view.getByTestId('bottom-tab-dock').props.style);
    expect(dockStyle.backgroundColor).toBe('transparent');
    expect(dockStyle.position).toBe('absolute');
    expect(dockStyle.bottom).toBe(0);
    expect(dockStyle.borderWidth).toBeUndefined();
    expect(dockStyle.shadowOpacity).toBeUndefined();
    expect(dockStyle.elevation).toBeUndefined();

    const barStyle = StyleSheet.flatten(view.getByTestId('bottom-tab-bar').props.style);
    expect(barStyle.backgroundColor).toBe('transparent');
    expect(barStyle.borderWidth).toBeUndefined();
    expect(barStyle.shadowOpacity).toBeUndefined();

    const activeTabStyle = StyleSheet.flatten(view.getByTestId('bottom-tab-item-home').props.style);
    expect(activeTabStyle.backgroundColor).toBe('transparent');
  });

  it('fades content alpha without painting over the background', async () => {
    const view = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <ContentFadeMask><View testID="masked-content" /></ContentFadeMask>
      </SafeAreaProvider>,
    );

    expect(view.getByTestId('content-fade-mask')).toBeTruthy();
    expect(view.getByTestId('content-fade-gradient')).toBeTruthy();
    const gradient = view.getByTestId('content-fade-gradient');
    expect(StyleSheet.flatten(gradient.props.style)).toMatchObject({ height: CONTENT_FADE_LENGTH });
    expect(gradient.props.colors).toEqual(CONTENT_FADE_COLORS.map((color) => processColor(color)));
    expect(gradient.props.locations).toEqual(CONTENT_FADE_PROGRESS);
    expect(StyleSheet.flatten(view.getByTestId('content-fade-opaque-region').props.style)).toMatchObject({
      backgroundColor: 'white',
      flex: 1,
    });
    expect(StyleSheet.flatten(view.getByTestId('content-fade-hidden-region').props.style)).toMatchObject({
      backgroundColor: 'transparent',
      height: 34,
    });
    expect(view.getByTestId('masked-content')).toBeTruthy();
  });

  it('hides only the safe-area sliver so content still dissolves through the icon row', () => {
    const geometry = getContentFadeGeometry(34);
    const hiddenHeight = getContentHiddenHeight(34);

    expect(hiddenHeight).toBe(34);
    expect(hiddenHeight).toBeLessThan(DOCK_BAR_HEIGHT);
    expect(geometry.dockHeight).toBe(DOCK_BAR_HEIGHT + 34);
    expect(geometry.iconRowTopFromScreenBottom).toBe(DOCK_BAR_HEIGHT + 34);
    expect(geometry.endFromScreenBottom).toBe(34);
    expect(geometry.startFromScreenBottom).toBe(34 + CONTENT_FADE_LENGTH);

    const fadeIntoIconRow = geometry.startFromScreenBottom - geometry.iconRowTopFromScreenBottom;
    expect(fadeIntoIconRow).toBeGreaterThan(0);
    expect(fadeIntoIconRow).toBeLessThan(CONTENT_FADE_LENGTH);

    const tAtIconTop = fadeIntoIconRow / CONTENT_FADE_LENGTH;
    const alphaAtIconTop = getContentFadeAlpha(tAtIconTop);
    expect(alphaAtIconTop).toBeGreaterThan(0.45);
    expect(alphaAtIconTop).toBeLessThan(0.65);
    expect(getContentFadeAlpha(1)).toBe(0);
  });

  it('uses a monotonic linear content-alpha ramp with no painted dock fill', () => {
    expect(getContentFadeAlpha(0)).toBe(1);
    expect(getContentFadeAlpha(0.5)).toBeCloseTo(0.5, 5);
    expect(getContentFadeAlpha(1)).toBe(0);

    const alphas = CONTENT_FADE_STOPS.map((stop) => stop.alpha);
    const locations = CONTENT_FADE_STOPS.map((stop) => stop.location);
    expect(alphas[0]).toBe(1);
    expect(alphas[alphas.length - 1]).toBe(0);
    for (let i = 1; i < alphas.length; i += 1) {
      expect(alphas[i]).toBeLessThan(alphas[i - 1]);
      expect(locations[i]).toBeGreaterThan(locations[i - 1]);
    }
  });

  it('reserves scroll room above the floating dock without reserving screen layout', () => {
    expect(layout.tabBarContentInset).toBeGreaterThanOrEqual(layout.tabBarHeight + 64);
  });

  it('uses the Home heat recipe for every screen canvas', () => {
    for (const variant of ['content', 'detail', 'night', 'ivory'] as const) {
      expect(gradients[variant]).toBe(gradients.homeHeat);
    }
  });
});
