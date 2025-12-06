const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseDelay = 500
): Promise<T> {
  let attempt = 0;

  while (attempt < attempts) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const msg = String(err?.message ?? err).toLowerCase();

      const retriable =
        msg.includes("timed out") ||
        msg.includes("timeout") ||
        msg.includes("rate limit") ||
        msg.includes("429") ||
        msg.includes("ddos") ||
        msg.includes("econnreset") ||
        msg.includes("enetunreach") ||
        msg.includes("network");

      if (!retriable || attempt >= attempts) {
        throw err;
      }
      const delay = baseDelay * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      await sleep(delay);
    }
  }
  throw new Error("retry exhausted");
}
