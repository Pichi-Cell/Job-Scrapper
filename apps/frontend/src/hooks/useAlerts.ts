import { useCallback, useEffect, useState } from "react";
import {
  createAlertFromFilters,
  deleteAlert,
  fetchAlertNotifications,
  fetchAlerts,
  subscribeToPushNotifications,
} from "../services/alertsApi.js";
import type { AlertNotification, JobAlert, JobFilters } from "../types/jobs.js";

export interface AlertsState {
  alerts: JobAlert[];
  notifications: AlertNotification[];
  error: string | null;
  isSaving: boolean;
  createAlert: (name: string, filters: JobFilters) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
  enableNotifications: () => Promise<void>;
}

export function useAlerts(): AlertsState {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [nextAlerts, nextNotifications] = await Promise.all([
      fetchAlerts(),
      fetchAlertNotifications(),
    ]);
    setAlerts(nextAlerts);
    setNotifications(nextNotifications);
  }, []);

  useEffect(() => {
    void refresh().catch((nextError: unknown) => {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to load alerts",
      );
    });

    const interval = window.setInterval(() => {
      void refresh();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  const createAlert = useCallback(
    async (name: string, filters: JobFilters) => {
      setIsSaving(true);
      setError(null);

      try {
        await createAlertFromFilters(name, filters);
        await subscribeToPushNotifications();
        await refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to save alert");
      } finally {
        setIsSaving(false);
      }
    },
    [refresh],
  );

  const removeAlert = useCallback(
    async (id: string) => {
      setError(null);
      await deleteAlert(id);
      await refresh();
    },
    [refresh],
  );

  const enableNotifications = useCallback(async () => {
    setError(null);
    await subscribeToPushNotifications();
  }, []);

  return {
    alerts,
    notifications,
    error,
    isSaving,
    createAlert,
    removeAlert,
    enableNotifications,
  };
}
