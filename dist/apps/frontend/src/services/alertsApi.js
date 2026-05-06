import { buildSourceParams } from "./jobsApi.js";
export async function fetchAlerts() {
    return fetchJson("/api/v1/alerts");
}
export async function fetchAlertNotifications() {
    return fetchJson("/api/v1/alerts/notifications");
}
export async function createAlertFromFilters(name, filters) {
    const sourceFilters = filters.sources.map((source) => ({
        source,
        options: Object.fromEntries(buildSourceParams(source, filters).entries()),
    }));
    return fetchJson("/api/v1/alerts", {
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
export async function deleteAlert(id) {
    await fetchJson(`/api/v1/alerts/${id}`, {
        method: "DELETE",
    });
}
export async function subscribeToPushNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support background notifications");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        throw new Error("Notification permission was not granted");
    }
    const registration = await navigator.serviceWorker.register("/alert-sw.js");
    const { publicKey } = await fetchJson("/api/v1/alerts/push-public-key");
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription !== null) {
        await existingSubscription.unsubscribe();
    }
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetchJson("/api/v1/alerts/push-subscriptions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription),
    });
}
async function fetchJson(url, init) {
    const response = await fetch(url, init);
    const payload = (await response.json());
    if (!response.ok || payload.error !== null) {
        throw new Error(payload.error ?? `Request failed with status ${response.status}`);
    }
    return payload.data;
}
function urlBase64ToUint8Array(value) {
    const padding = "=".repeat((4 - (value.length % 4)) % 4);
    const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let index = 0; index < rawData.length; index += 1) {
        output[index] = rawData.charCodeAt(index);
    }
    return output;
}
