const exerciseNames: Record<string, string> = {
  walking: 'walking',
  lifting: 'lifting',
  pilates: 'Pilates',
  yoga: 'yoga',
  running: 'running',
  cycling: 'cycling',
  swimming: 'swimming',
};

export function weeklyExerciseQuestion(preference: unknown): string {
  const exercise = typeof preference === 'string' ? exerciseNames[preference] ?? 'exercise' : 'exercise';
  return `How many hours of ${exercise} do you do per week?`;
}
