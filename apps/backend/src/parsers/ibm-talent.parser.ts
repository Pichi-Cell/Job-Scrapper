import type { JobListing } from "../../../../packages/shared/src/index.js";

const IBM_AVATURE_DETAIL_URL = "https://ibmglobal.avature.net/en_US/careers/JobDetail";

interface GoogleTalentSearchResponse {
  matchingJobs?: GoogleTalentMatchingJob[];
  nextPageToken?: string;
}

interface GoogleTalentMatchingJob {
  job?: GoogleTalentJob;
}

interface GoogleTalentJob {
  name?: string;
  requisitionId?: string;
  title?: string;
  companyDisplayName?: string;
  addresses?: string[];
  description?: string;
  postingPublishTime?: string;
  applicationInfo?: {
    uris?: string[];
  };
  customAttributes?: Record<string, GoogleTalentCustomAttribute>;
}

interface GoogleTalentCustomAttribute {
  stringValues?: string[];
}

export interface ParsedIbmTalentPage {
  jobs: JobListing[];
  nextPageToken?: string;
}

export function parseIbmTalentSearchResponse(
  payload: unknown,
): ParsedIbmTalentPage {
  const response = payload as GoogleTalentSearchResponse;
  const parsedPage: ParsedIbmTalentPage = {
    jobs: (response.matchingJobs ?? [])
      .map((matchingJob) => matchingJob.job)
      .filter(isDefined)
      .map(mapGoogleTalentJobToJobListing)
      .filter(isDefined),
  };

  if (response.nextPageToken !== undefined) {
    parsedPage.nextPageToken = response.nextPageToken;
  }

  return parsedPage;
}

function mapGoogleTalentJobToJobListing(
  job: GoogleTalentJob,
): JobListing | undefined {
  const id = normalizeText(job.requisitionId) ?? parseJobIdFromName(job.name);
  const title = normalizeText(job.title);
  const company = normalizeText(job.companyDisplayName) ?? "IBM";
  const url = getApplicationUrl(job, id);

  if (id === undefined || title === undefined || url === undefined) {
    return undefined;
  }

  const location = normalizeText(job.addresses?.join(", "));
  const description = normalizeText(stripHtml(job.description));
  const datePosted = normalizeIsoDate(job.postingPublishTime);
  const remote = inferRemote(title, location, description);

  const jobListing: JobListing = {
    id,
    title,
    company,
    url,
    source: "IBM Talent",
  };

  if (location !== undefined) {
    jobListing.location = location;
  }

  if (remote !== undefined) {
    jobListing.remote = remote;
  }

  if (description !== undefined) {
    jobListing.description = description;
  }

  if (datePosted !== undefined) {
    jobListing.datePosted = datePosted;
  }

  return jobListing;
}

function getApplicationUrl(
  job: GoogleTalentJob,
  id: string | undefined,
): string | undefined {
  const firstUri = job.applicationInfo?.uris?.find((uri) => uri.startsWith("http"));

  if (firstUri !== undefined) {
    return firstUri;
  }

  if (id === undefined) {
    return undefined;
  }

  const detailUrl = new URL(IBM_AVATURE_DETAIL_URL);
  detailUrl.searchParams.set("jobId", id);
  detailUrl.searchParams.set("source", "WEB_Search");
  return detailUrl.toString();
}

function parseJobIdFromName(name: string | undefined): string | undefined {
  if (name === undefined) {
    return undefined;
  }

  return name.split("/").at(-1);
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized === "" ? undefined : normalized;
}

function normalizeIsoDate(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function stripHtml(value: string | undefined): string | undefined {
  return value?.replace(/<[^>]*>/g, " ");
}

function inferRemote(
  title: string,
  location: string | undefined,
  description: string | undefined,
): boolean | undefined {
  const searchableText = [title, location, description].filter(isDefined).join(" ");

  if (/\b(remote|remoto|home office|work from home)\b/i.test(searchableText)) {
    return true;
  }

  return undefined;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
