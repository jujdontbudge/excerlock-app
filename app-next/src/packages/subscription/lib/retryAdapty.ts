import { adaptyErrorCode } from '../purchaseErrors';

const transient = new Set([7, 97, 99, 102, 112, 1002, 1010, 1011, 1020, 2004, 2005, 3101]);
const retryDelays = [300, 900];

export async function retryAdapty<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delay = retryDelays[attempt];
      const code = adaptyErrorCode(error);
      if (delay === undefined || code === null || !transient.has(code)) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
}
