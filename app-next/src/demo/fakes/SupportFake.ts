import { SupportPort } from '../../ports/SupportPort';
import { FakeContext } from '../FakeContext';
export function SupportFake(ctx: FakeContext): SupportPort {
  return {
    send: async (request) => {
      if (!request.message.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.replyTo))
        throw new Error();
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (ctx.result() === 'cancel') throw new Error();
      ctx.log('support_sent', { category: request.category, characters: request.message.trim().length });
    },
  };
}
