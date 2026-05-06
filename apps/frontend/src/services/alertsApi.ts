import type {
  AlertNotification,
  AlertSourceFilter,
  JobAlert,
  JobFilters,
} from "../types/jobs.js";
import { buildSourceParams } from "./jobsApi.js";

interface ApiResponse<T> {
  data: T;
  error: string | null;
}

interface PushPublicKey {
  publicKey: string;
}

export async function fetchAlerts(): Promise<JobAlert[]> {
  return fetchJson<JobAlert[]>("/api/v1/alerts");
}

export async function fetchAlertNotifications(): Promise<AlertNotification[]> {
  return fetchJson<AlertNotification[]>("/api/v1/alerts/notifications");
}

export async function createAlertFromFilters(
  name: string,
  filters: JobFilters,
): Promise<JobAlert> {
  const sourceFilters: AlertSourceFilter[] = filters.sources.map((source) => ({
    source,
    options: Object.fromEntries(buildSourceParams(source, filters).entries()),
  }));

  return fetchJson<JobAlert>("/api/v1/alerts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      filters: sourceFilters,
    }),
  });
}

export async function deleteAlert(id: string): Promise<void> {
  await fetchJson<{ deleted: boolean }>(`/api/v1/alerts/${id}`, {
    method: "DELETE",
  });
}

export async function subscribeToPushNotifications(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("This browser does not support background notifications");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await navigator.serviceWorker.register("/alert-sw.js");
  const { publicKey } = await fetchJson<PushPublicKey>(
    "/api/v1/alerts/push-public-key",
  );
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription !== null) {
    await existingSubscription.unsubscribe();
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetchJson<{ subscribed: boolean }>("/api/v1/alerts/push-subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription),
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error !== null) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload.data;
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}
