self.addEventListener("push", (event) => {
  if (event.data === null) {
    return;
  }

  const payload = event.data.json();
  const notification = payload.notification;
  const firstJob = notification.jobs[0];

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: `${payload.body}${firstJob ? `: ${firstJob.title}` : ""}`,
      requireInteraction: true,
      tag: notification.id,
      data: {
        url: payload.url,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    }),
  );
});
