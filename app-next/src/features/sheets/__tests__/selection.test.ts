import { toggleSelection, finishSelection, restoreSelection } from '../selection';
test('picker exports only emptiness and an opaque handle', () => {
  let ids = toggleSelection([], 'app-a');
  ids = toggleSelection(ids, 'category-social');
  ids = toggleSelection(ids, 'app-b');
  ids = toggleSelection(ids, 'app-a');
  const result = finishSelection(ids);
  expect(result).toMatchObject({ isEmpty: false });
  expect(Object.keys(result).sort()).toEqual(['handle', 'isEmpty']);
  expect(restoreSelection(result)).toEqual([]);
  expect(finishSelection([])).toEqual({ handle: null, isEmpty: true });
});
