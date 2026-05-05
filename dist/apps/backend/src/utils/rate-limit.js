import { sleep } from "./sleep.js";
export class DomainRateLimiter {
    minimumDelayMs;
    lastRequestByDomain = new Map();
    constructor(minimumDelayMs) {
        this.minimumDelayMs = minimumDelayMs;
    }
    async waitFor(url) {
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
