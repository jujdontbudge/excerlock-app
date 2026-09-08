import { RuleIssue } from '../../domain/validateRule';
import { RuleDraft } from './draft';
import { goalStep } from './plan';
/** The builder step a reported rule issue sends the user back to. */
export function issueStep(draft: RuleDraft, issues: readonly RuleIssue[]): string {
  return issues.some((issue) => issue === 'days' || issue === 'window') ? 'S1' : goalStep(draft);
}
