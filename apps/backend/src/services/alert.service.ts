import type { JobListing } from "../../../../packages/shared/src/index.js";
import type { ScraperOptions } from "../types/scraper.js";
import {
  type JobSource,
  type SourceSearchRequest,
  searchSources,
} from "./job-search.service.js";
import { sendAlertNotification } from "./push.service.js";

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface AlertSourceFilter {
  source: JobSource;
  options: ScraperOptions;
}

export interface CreateAlertInput {
  name: string;
  filters: AlertSourceFilter[];
}

export interface JobAlert {
  id: string;
  name: string;
  filters: AlertSourceFilter[];
  createdAt: string;
  lastCheckedAt: string | null;
  lastMatchCount: number;
  isPolling: boolean;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  createdAt: string;
  jobs: JobListing[];
}

interface AlertRecord extends JobAlert {
  knownJobKeys: Set<string>;
  timer: ReturnType<typeof setInterval>;
}

const alerts = new Map<string, AlertRecord>();
const notifications: AlertNotification[] = [];

export function listAlerts(): JobAlert[] {
  return [...alerts.values()].map(toPublicAlert);
}

export function listNotifications(): AlertNotification[] {
  return [...notifications].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function createAlert(input: CreateAlertInput): JobAlert {
  const alert: AlertRecord = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    filters: input.filters,
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
    lastMatchCount: 0,
    isPolling: false,
    knownJobKeys: new Set<string>(),
    timer: setInterval(() => {
      void pollAlert(alert.id);
    }, POLL_INTERVAL_MS),
  };

  alerts.set(alert.id, alert);
  void pollAlert(alert.id, { baselineOnly: true });

  return toPublicAlert(alert);
}

export function deleteAlert(id: string): boolean {
  const alert = alerts.get(id);

  if (alert === undefined) {
    return false;
  }

  clearInterval(alert.timer);
  alerts.delete(id);
  return true;
}

export async function pollAlert(
  id: string,
  options: { baselineOnly?: boolean } = {},
): Promise<AlertNotification | null> {
  const alert = alerts.get(id);

  if (alert === undefined || alert.isPolling) {
    return null;
  }

  alert.isPolling = true;

  try {
    const requests: SourceSearchRequest[] = alert.filters.map((filter) => ({
      source: filter.source,
      options: filter.options,
    }));
    const results = await searchSources(requests);
    const jobs = results.flatMap((result) => result.jobs);
    const newJobs = jobs.filter((job) => !alert.knownJobKeys.has(getJobKey(job)));

    for (const job of jobs) {
      alert.knownJobKeys.add(getJobKey(job));
    }

    alert.lastCheckedAt = new Date().toISOString();
    alert.lastMatchCount = jobs.length;

    if (options.baselineOnly === true || newJobs.length === 0) {
      return null;
    }

    const notification: AlertNotification = {
      id: crypto.randomUUID(),
      alertId: alert.id,
      alertName: alert.name,
      createdAt: new Date().toISOString(),
      jobs: newJobs,
    };

    notifications.unshift(notification);
    await sendAlertNotification(notification);

    return notification;
  } finally {
    alert.isPolling = false;
  }
}

function getJobKey(job: JobListing): string {
  return job.url.trim() !== "" ? job.url : `${job.source}:${job.id}`;
}

function toPublicAlert(alert: AlertRecord): JobAlert {
  return {
    id: alert.id,
    name: alert.name,
    filters: alert.filters,
    createdAt: alert.createdAt,
    lastCheckedAt: alert.lastCheckedAt,
    lastMatchCount: alert.lastMatchCount,
    isPolling: alert.isPolling,
  };
}
