import { toggleSelection, finishSelection, restoreSelection } from '../selection';
test('picker toggles generic identifiers, exports only aggregate counts and an opaque handle', () => {
  let ids = toggleSelection([], 'app-a');
  ids = toggleSelection(ids, 'category-social');
  ids = toggleSelection(ids, 'app-b');
  ids = toggleSelection(ids, 'app-a');
  const result = finishSelection(ids);
  expect(result).toMatchObject({ appCount: 1, categoryCount: 1 });
  expect(Object.keys(result).sort()).toEqual(['appCount', 'categoryCount', 'handle']);
  expect(restoreSelection(result).sort()).toEqual(ids.sort());
  expect(finishSelection([])).toEqual({ handle: null, appCount: 0, categoryCount: 0 });
});
