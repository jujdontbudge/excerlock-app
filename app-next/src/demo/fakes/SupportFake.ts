import { SupportPort } from '../../ports/SupportPort';
import { FakeContext } from '../FakeContext';
export function SupportFake(ctx: FakeContext): SupportPort {
  return {
    send: async (category, message) => {
      if (!message.trim()) throw new Error('Message required');
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (ctx.result() === 'cancel') throw new Error('Cancelled');
      ctx.log('support_sent', { category, characters: message.trim().length });
    },
  };
}
