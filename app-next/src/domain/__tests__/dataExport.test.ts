import { buildDataExport, dataExportFileName, dataExportJson } from '../dataExport';
import { Rule } from '../types';

const rule: Rule = {
  id: 'r1',
  activity: 'gym',
  mode: { kind: 'event', activity: 'gym', trigger: 'arrival' },
  schedule: { days: [1, 3], window: { kind: 'range', startMinute: 540, endMinute: 1020 } },
  enabled: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

test('the export is the documented JSON, sorted by day, with no selection or gym data', () => {
  const data = buildDataExport({
    exportedAt: '2026-09-10T12:00:00.000Z',
    userId: 'user-1',
    units: 'km',
    rules: [rule],
    ruleDays: [
      { ruleId: 'r1', day: '2026-09-09', progress: 1, met: true, metAt: '2026-09-09T10:00:00.000Z' },
      { ruleId: 'r1', day: '2026-09-08', progress: 0, met: false, metAt: null },
    ],
    earnedUnlocks: [
      {
        day: '2026-09-09',
        ruleId: 'r1',
        ruleName: 'Gym arrival',
        metAt: '2026-09-09T10:00:00.000Z',
        windowEnd: '2026-09-09T17:00:00.000Z',
      },
    ],
    history: [
      {
        day: '2026-09-09',
        usageMinutes: 30,
        activity: { walking: 0, gym: 45, running: 0, biking: 0 },
        met: true,
        scheduled: true,
      },
      {
        day: '2026-09-08',
        usageMinutes: null,
        activity: { walking: 0, gym: 0, running: 0, biking: 0 },
        met: false,
        scheduled: true,
      },
    ],
  });
  expect(data).toEqual({
    format: 'excerlock-data-export',
    version: 1,
    exportedAt: '2026-09-10T12:00:00.000Z',
    userId: 'user-1',
    units: 'km',
    rules: [rule],
    ruleDays: [
      { ruleId: 'r1', day: '2026-09-08', progress: 0, met: false, metAt: null },
      { ruleId: 'r1', day: '2026-09-09', progress: 1, met: true, metAt: '2026-09-09T10:00:00.000Z' },
    ],
    earnedUnlocks: [
      {
        day: '2026-09-09',
        ruleId: 'r1',
        ruleName: 'Gym arrival',
        metAt: '2026-09-09T10:00:00.000Z',
        windowEnd: '2026-09-09T17:00:00.000Z',
      },
    ],
    history: [
      {
        day: '2026-09-08',
        usageMinutes: null,
        activity: { walking: 0, gym: 0, running: 0, biking: 0 },
        met: false,
        scheduled: true,
      },
      {
        day: '2026-09-09',
        usageMinutes: 30,
        activity: { walking: 0, gym: 45, running: 0, biking: 0 },
        met: true,
        scheduled: true,
      },
    ],
  });
  expect(Object.keys(data)).not.toEqual(expect.arrayContaining(['lockedApps', 'gymPlaces']));
  expect(dataExportJson(data)).not.toMatch(/handle|token|latitude/);
  expect(dataExportFileName(data.exportedAt)).toBe('excerlock-export-2026-09-10.json');
});
