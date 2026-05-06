import webPush, { type PushSubscription } from "web-push";
import type { AlertNotification } from "./alert.service.js";

const vapidKeys = webPush.generateVAPIDKeys();
const subscriptions = new Map<string, PushSubscription>();

webPush.setVapidDetails(
  "mailto:alerts@job-scraper.local",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

export interface PushPublicKey {
  publicKey: string;
}

export function getPushPublicKey(): PushPublicKey {
  return {
    publicKey: vapidKeys.publicKey,
  };
}

export function addPushSubscription(subscription: PushSubscription): void {
  subscriptions.set(subscription.endpoint, subscription);
}

export async function sendAlertNotification(
  notification: AlertNotification,
): Promise<void> {
  const payload = JSON.stringify({
    title: `${notification.jobs.length} new position${
      notification.jobs.length === 1 ? "" : "s"
    }`,
    body: notification.alertName,
    url: "/",
    notification,
  });

  await Promise.all(
    [...subscriptions.values()].map(async (subscription) => {
      try {
        await webPush.sendNotification(subscription, payload);
      } catch (error) {
        console.error("[push] failed to send alert notification", error);
        subscriptions.delete(subscription.endpoint);
      }
    }),
  );
}
