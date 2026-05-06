import webPush from "web-push";
const vapidKeys = webPush.generateVAPIDKeys();
const subscriptions = new Map();
webPush.setVapidDetails("mailto:alerts@job-scraper.local", vapidKeys.publicKey, vapidKeys.privateKey);
export function getPushPublicKey() {
    return {
        publicKey: vapidKeys.publicKey,
    };
}
export function addPushSubscription(subscription) {
    subscriptions.set(subscription.endpoint, subscription);
}
export async function sendAlertNotification(notification) {
    const payload = JSON.stringify({
        title: `${notification.jobs.length} new position${notification.jobs.length === 1 ? "" : "s"}`,
        body: notification.alertName,
        url: "/",
        notification,
    });
    await Promise.all([...subscriptions.values()].map(async (subscription) => {
        try {
            await webPush.sendNotification(subscription, payload);
        }
        catch (error) {
            console.error("[push] failed to send alert notification", error);
            subscriptions.delete(subscription.endpoint);
        }
    }));
}
