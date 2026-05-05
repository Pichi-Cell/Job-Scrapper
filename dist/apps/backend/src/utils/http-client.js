import { sleep } from "./sleep.js";
export class HttpRequestError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = "HttpRequestError";
    }
}
export async function fetchJson(url, options = {}) {
    const retries = options.retries ?? 3;
    const timeoutMs = options.timeoutMs ?? 15_000;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            await options.rateLimiter?.waitFor(url);
            const response = await fetch(url, {
                headers: {
                    accept: "application/json",
                    "user-agent": "JobScraper/0.1 (+respectful research scraper)",
                },
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new HttpRequestError(`Request failed with status ${response.status}`, response.status);
            }
            return (await response.json());
        }
        catch (error) {
            if (attempt === retries) {
                throw error;
            }
            await sleep(500 * attempt);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    throw new HttpRequestError("Request failed without a response");
}
