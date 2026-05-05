import { sleep } from "./sleep.js";

export class DomainRateLimiter {
  private readonly lastRequestByDomain = new Map<string, number>();

  constructor(private readonly minimumDelayMs: number) {}

  async waitFor(url: URL): Promise<void> {
    const previousRequestAt = this.lastRequestByDomain.get(url.hostname);
    const now = Date.now();

    if (previousRequestAt !== undefined) {
      const elapsedMs = now - previousRequestAt;
      const remainingDelayMs = this.minimumDelayMs - elapsedMs;

      if (remainingDelayMs > 0) {
        await sleep(remainingDelayMs);
      }
    }

    this.lastRequestByDomain.set(url.hostname, Date.now());
  }
}
