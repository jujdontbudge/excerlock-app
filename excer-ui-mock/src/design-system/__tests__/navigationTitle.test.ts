import { isQuestionTitle } from '../navigationTitle';

describe('navigation title placement', () => {
  it('stacks questions but keeps destination titles in the navigation row', () => {
    expect(isQuestionTitle('What could work better?')).toBe(true);
    expect(isQuestionTitle('Why are my apps still locked?  ')).toBe(true);
    expect(isQuestionTitle('Account')).toBe(false);
    expect(isQuestionTitle('Restore purchases')).toBe(false);
  });
});
