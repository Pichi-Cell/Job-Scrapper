import * as cheerio from "cheerio";
const BUMERAN_BASE_URL = "https://www.bumeran.com.ar";
export function parseBumeranSearchResponse(payload, options = {}) {
    return (payload.content ?? [])
        .filter((record) => options.includeClosed === true || !isClosedBumeranJob(record))
        .map(mapBumeranApiJob)
        .filter(isDefined);
}
export function parseBumeranJobs(html) {
    const $ = cheerio.load(html);
    const jobs = new Map();
    for (const job of parseJsonLdJobs($)) {
        jobs.set(job.url, job);
    }
    for (const job of parseCardJobs($)) {
        jobs.set(job.url, job);
    }
    return [...jobs.values()];
}
function mapBumeranApiJob(record) {
    if (!isRecord(record)) {
        return undefined;
    }
    const id = getString(record.id) ?? getNumberString(record.id);
    const title = getString(record.titulo);
    if (id === undefined || title === undefined) {
        return undefined;
    }
    const company = getString(record.empresa);
    const location = getString(record.localizacion);
    const modality = getString(record.modalidadTrabajo);
    const description = normalizeText(stripHtml(getString(record.detalle)));
    const jobListing = {
        id,
        title,
        company: company ?? "Bumeran",
        url: buildBumeranJobUrl(id, title, company),
        source: "Bumeran",
    };
    const locationParts = [location, modality].filter(isDefined);
    if (locationParts.length > 0) {
        jobListing.location = locationParts.join("; ");
    }
    if (modality !== undefined) {
        jobListing.remote = /remoto|remote|teletrabajo/i.test(modality);
    }
    if (description !== undefined) {
        jobListing.description = description;
    }
    const datePosted = parseBumeranDate(getString(record.fechaHoraPublicacion) ?? getString(record.fechaPublicacion));
    if (datePosted !== undefined) {
        jobListing.datePosted = datePosted;
    }
    return jobListing;
}
function isClosedBumeranJob(record) {
    if (!isRecord(record)) {
        return false;
    }
    const inactiveBooleans = [
        record.activo,
        record.active,
        record.vigente,
        record.visible,
        record.online,
        record.publicado,
        record.published,
        record.habilitado,
    ];
    if (inactiveBooleans.some((value) => value === false)) {
        return true;
    }
    const closedBooleans = [
        record.cerrado,
        record.closed,
        record.finalizado,
        record.finished,
        record.vencido,
        record.expired,
        record.caducado,
        record.deleted,
        record.eliminado,
        record.baja,
    ];
    if (closedBooleans.some((value) => value === true)) {
        return true;
    }
    const statusValues = [
        record.estado,
        record.status,
        record.estadoAviso,
        record.avisoEstado,
        record.estadoPublicacion,
        record.publicationStatus,
        record.situacion,
    ]
        .map(getString)
        .filter(isDefined);
    return statusValues.some((value) => /cerrad|closed|finaliz|finished|vencid|expired|caduc|inactiv|inactive|pausad|paused|baja|eliminad|deleted|no\s+disponible/i.test(value));
}
function parseJsonLdJobs($) {
    const jobs = [];
    $('script[type="application/ld+json"]').each((_index, element) => {
        const rawJson = $(element).text();
        for (const record of collectJobPostingRecords(parseJson(rawJson))) {
            const job = mapJsonLdJob(record);
            if (job !== undefined) {
                jobs.push(job);
            }
        }
    });
    return jobs;
}
function parseCardJobs($) {
    const jobs = [];
    $('a[href*="/empleos"], a[href*="/empleo"]').each((_index, link) => {
        const job = mapCardJob($, link);
        if (job !== undefined) {
            jobs.push(job);
        }
    });
    return jobs;
}
function mapJsonLdJob(record) {
    const title = getString(record.title);
    const url = normalizeBumeranUrl(getString(record.url));
    if (title === undefined || url === undefined) {
        return undefined;
    }
    const jobListing = {
        id: getBumeranJobId(url),
        title,
        company: getHiringOrganizationName(record.hiringOrganization) ?? "Bumeran",
        url,
        source: "Bumeran",
    };
    const location = getJobLocation(record.jobLocation);
    if (location !== undefined) {
        jobListing.location = location;
        jobListing.remote = /remoto|remote|teletrabajo/i.test(location);
    }
    const description = normalizeText(stripHtml(getString(record.description)));
    if (description !== undefined) {
        jobListing.description = description;
    }
    const datePosted = normalizeDate(getString(record.datePosted));
    if (datePosted !== undefined) {
        jobListing.datePosted = datePosted;
    }
    return jobListing;
}
function mapCardJob($, link) {
    const href = $(link).attr("href");
    const url = normalizeBumeranUrl(href);
    if (url === undefined) {
        return undefined;
    }
    const card = $(link).closest("article, li, div");
    const title = normalizeText($(link).find("h1, h2, h3").first().text() || $(link).text()) ?? "Untitled Bumeran role";
    const company = normalizeText(card.find('[class*="empresa"], [class*="company"]').first().text());
    const location = normalizeText(card.find('[class*="ubicacion"], [class*="location"]').first().text());
    const jobListing = {
        id: getBumeranJobId(url),
        title,
        company: company ?? "Bumeran",
        url,
        source: "Bumeran",
    };
    if (location !== undefined) {
        jobListing.location = location;
        jobListing.remote = /remoto|remote|teletrabajo/i.test(location);
    }
    return jobListing;
}
function collectJobPostingRecords(value) {
    if (Array.isArray(value)) {
        return value.flatMap(collectJobPostingRecords);
    }
    if (!isRecord(value)) {
        return [];
    }
    const type = value["@type"];
    if (type === "JobPosting" ||
        (Array.isArray(type) && type.some((item) => item === "JobPosting"))) {
        return [value];
    }
    return Object.values(value).flatMap(collectJobPostingRecords);
}
function getHiringOrganizationName(value) {
    return isRecord(value) ? getString(value.name) : undefined;
}
function getJobLocation(value) {
    const firstLocation = Array.isArray(value) ? value[0] : value;
    if (!isRecord(firstLocation)) {
        return undefined;
    }
    const address = firstLocation.address;
    if (!isRecord(address)) {
        return getString(firstLocation.name);
    }
    const parts = [
        getString(address.addressLocality),
        getString(address.addressRegion),
        getString(address.addressCountry),
    ].filter(isDefined);
    return parts.length > 0 ? parts.join(", ") : undefined;
}
function normalizeBumeranUrl(href) {
    if (href === undefined || href.trim() === "") {
        return undefined;
    }
    return new URL(href, BUMERAN_BASE_URL).toString();
}
function buildBumeranJobUrl(id, title, company) {
    const slug = toSlug([title, company].filter(isDefined).join(" "));
    return `${BUMERAN_BASE_URL}/empleos/${slug}-${id}.html`;
}
function getBumeranJobId(url) {
    const parsedUrl = new URL(url);
    const numericId = /(\d+)(?:\.html)?$/.exec(parsedUrl.pathname)?.[1];
    return numericId ?? parsedUrl.pathname;
}
function normalizeDate(value) {
    if (value === undefined) {
        return undefined;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}
function parseBumeranDate(value) {
    if (value === undefined) {
        return undefined;
    }
    const [datePart, timePart = "00:00:00"] = value.split(" ");
    const [day, month, year] = datePart?.split("-") ?? [];
    if (day === undefined || month === undefined || year === undefined) {
        return normalizeDate(value);
    }
    const timestamp = Date.parse(`${year}-${month}-${day}T${timePart}-03:00`);
    return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}
function stripHtml(value) {
    return value === undefined ? undefined : cheerio.load(value).text();
}
function normalizeText(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized === "" ? undefined : normalized;
}
function getString(value) {
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
function getNumberString(value) {
    return typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : undefined;
}
function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return undefined;
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isDefined(value) {
    return value !== undefined;
}
function toSlug(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}
