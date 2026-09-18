import { IncidentReportPort } from '../../ports/IncidentReportPort';
import { FakeContext } from '../FakeContext';
export function IncidentReportFake(ctx: FakeContext): IncidentReportPort {
  return {
    send: async ({ whatWentWrong, shouldHaveHappened }) => {
      if (!whatWentWrong.trim() || !shouldHaveHappened.trim()) throw new Error('Both answers are required');
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (ctx.result() === 'cancel') throw new Error('Cancelled');
      ctx.log('incident_report_sent', {
        wrongCharacters: whatWentWrong.trim().length,
        expectedCharacters: shouldHaveHappened.trim().length,
      });
      return { reportId: `fake-${Date.now()}` };
    },
  };
}
