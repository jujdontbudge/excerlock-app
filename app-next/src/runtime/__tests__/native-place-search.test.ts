import { requireOptionalNativeModule } from 'expo';
import { nativePlaceSearch } from '../NativePlaceSearch';
jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));
const nativeModule = jest.mocked(requireOptionalNativeModule);
test('worldwide queries pass through without country or gym filters', async () => {
  const suggest = jest.fn().mockResolvedValue([{ id: 'paris', title: 'Eiffel Tower', subtitle: 'Paris, France' }]);
  const resolve = jest.fn().mockResolvedValue({
    id: 'paris',
    latitude: 48.8584,
    longitude: 2.2945,
    name: 'Eiffel Tower',
    address: 'Paris',
  });
  nativeModule.mockReturnValue({ suggest, resolve } as never);
  const results = await nativePlaceSearch.suggest('Eiffel Tower Paris', { latitude: 41.884, longitude: -87.652 });
  expect(suggest).toHaveBeenCalledWith('Eiffel Tower Paris', 41.884, -87.652);
  expect(await nativePlaceSearch.resolve(results[0])).toMatchObject({
    latitude: 48.8584,
    longitude: 2.2945,
  });
  expect(resolve).toHaveBeenCalledWith('paris', 'Eiffel Tower', 'Paris, France');
});
test('missing native module errors instead of quietly using fictional results', async () => {
  nativeModule.mockReturnValue(null);
  await expect(nativePlaceSearch.suggest('Tokyo')).rejects.toThrow('updated iOS development build');
});
