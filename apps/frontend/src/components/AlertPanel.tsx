import { Bell, BellRing, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import type { AlertNotification, JobAlert, JobFilters } from "../types/jobs.js";

interface AlertPanelProps {
  filters: JobFilters;
  alerts: JobAlert[];
  notifications: AlertNotification[];
  error: string | null;
  isSaving: boolean;
  onCreateAlert: (name: string, filters: JobFilters) => Promise<void>;
  onRemoveAlert: (id: string) => Promise<void>;
  onEnableNotifications: () => Promise<void>;
}

export function AlertPanel({
  filters,
  alerts,
  notifications,
  error,
  isSaving,
  onCreateAlert,
  onRemoveAlert,
  onEnableNotifications,
}: AlertPanelProps) {
  async function handleCreateAlert(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("alertName") ?? "").trim();

    if (name !== "") {
      await onCreateAlert(name, filters);
      event.currentTarget.reset();
    }
  }

  return (
    <section className="alerts-panel">
      <header>
        <div>
          <h2>Position Alerts</h2>
          <p>Polls every 6 hours using the current filter set.</p>
        </div>
        <button
          className="icon-button"
          title="Enable background notifications"
          type="button"
          onClick={() => void onEnableNotifications()}
        >
          <Bell size={18} />
        </button>
      </header>

      <form className="alert-create" onSubmit={(event) => void handleCreateAlert(event)}>
        <input name="alertName" placeholder="Alert name" />
        <button disabled={isSaving} type="submit">
          <BellRing size={16} />
          Save
        </button>
      </form>

      {error !== null ? <p className="alert-error">{error}</p> : null}

      <div className="alert-list">
        {alerts.map((alert) => (
          <article className="alert-item" key={alert.id}>
            <div>
              <strong>{alert.name}</strong>
              <span>
                {alert.filters.map((filter) => filter.source.toUpperCase()).join(", ")}
              </span>
              <small>
                {alert.lastCheckedAt === null
                  ? "Preparing first run"
                  : `${alert.lastMatchCount} matches last run`}
              </small>
            </div>
            <button
              className="icon-button"
              title="Delete alert"
              type="button"
              onClick={() => void onRemoveAlert(alert.id)}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>

      {notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.slice(0, 5).map((notification) => (
            <article className="notification-item" key={notification.id}>
              <strong>{notification.alertName}</strong>
              <span>{notification.jobs.length} new positions</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
