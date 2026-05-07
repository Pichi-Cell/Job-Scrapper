import { chromium } from "playwright";
import { parseBumeranSearchResponse, } from "../parsers/bumeran.parser.js";
import { DomainRateLimiter } from "../utils/rate-limit.js";
import { sleep } from "../utils/sleep.js";
const BUMERAN_SEARCH_URL = "https://www.bumeran.com.ar/empleos-busqueda-software.html";
const DEFAULT_PAGE_SIZE = 20;
const REQUEST_RETRIES = 3;
const RENDER_TIMEOUT_MS = 45_000;
const RENDER_SETTLE_MS = 1_000;
const rateLimiter = new DomainRateLimiter(2_500);
export class BumeranScraper {
    source = "Bumeran";
    async scrape(options = {}) {
        const url = buildBumeranSearchUrl(options);
        const payload = await renderBumeranSearch(url);
        return {
            jobs: parseBumeranSearchResponse(payload, {
                includeClosed: options.includeClosed,
            }).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE),
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
async function renderBumeranSearch(url) {
    for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
        let browser;
        try {
            await rateLimiter.waitFor(url);
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage({
                locale: "es-AR",
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
            });
            const searchResponsePromise = page.waitForResponse((response) => response.url().includes("/api/avisos/searchV2"), { timeout: RENDER_TIMEOUT_MS });
            await page.goto(url.toString(), {
                timeout: RENDER_TIMEOUT_MS,
                waitUntil: "domcontentloaded",
            });
            const searchResponse = await searchResponsePromise;
            const responseText = await searchResponse.text();
            if (!searchResponse.ok()) {
                throw new Error(`Bumeran rendered search failed with status ${searchResponse.status()}: ${summarizeResponse(responseText)}`);
            }
            assertNotChallengePage(await page.content());
            await page.waitForTimeout(RENDER_SETTLE_MS);
            return JSON.parse(responseText);
        }
        catch (error) {
            if (attempt === REQUEST_RETRIES || isChallengeError(error)) {
                throw error;
            }
            await sleep(500 * attempt);
        }
        finally {
            await browser?.close();
        }
    }
    throw new Error("Bumeran request failed without a response");
}
function buildBumeranSearchUrl(options) {
    const query = toBumeranSlug(options.query ?? options.skills ?? "software");
    return new URL(`https://www.bumeran.com.ar/empleos-busqueda-${query}.html`, BUMERAN_SEARCH_URL);
}
function assertNotChallengePage(html) {
    if (html.includes("/cdn-cgi/challenge-platform/") ||
        /enable javascript and cookies/i.test(html)) {
        throw new BumeranChallengeError(`Bumeran returned a Cloudflare challenge; scraper will not bypass it. Response: ${summarizeResponse(html)}`);
    }
}
function toBumeranSlug(value) {
    const slug = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return slug === "" ? "software" : slug;
}
class BumeranChallengeError extends Error {
    constructor(message) {
        super(message);
        this.name = "BumeranChallengeError";
    }
}
function isChallengeError(error) {
    return error instanceof BumeranChallengeError;
}
function summarizeResponse(responseText) {
    return responseText
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "[script omitted]")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "[style omitted]")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
}
