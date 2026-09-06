/**
 * Prompt screens use a stacked heading: navigation first, then the question.
 * Destination screens keep their title centered in the navigation row.
 */
export function isQuestionTitle(title?: string | null) {
  return Boolean(title?.trim().endsWith('?'));
}
