import { useCallback, useEffect, useState } from "react";
import { createAlertFromFilters, deleteAlert, fetchAlertNotifications, fetchAlerts, subscribeToPushNotifications, } from "../services/alertsApi.js";
export function useAlerts() {
    const [alerts, setAlerts] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState(null);
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
        void refresh().catch((nextError) => {
            setError(nextError instanceof Error ? nextError.message : "Unable to load alerts");
        });
        const interval = window.setInterval(() => {
            void refresh();
        }, 60_000);
        return () => window.clearInterval(interval);
    }, [refresh]);
    const createAlert = useCallback(async (name, filters) => {
        setIsSaving(true);
        setError(null);
        try {
            await createAlertFromFilters(name, filters);
            await subscribeToPushNotifications();
            await refresh();
        }
        catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Unable to save alert");
        }
        finally {
            setIsSaving(false);
        }
    }, [refresh]);
    const removeAlert = useCallback(async (id) => {
        setError(null);
        await deleteAlert(id);
        await refresh();
    }, [refresh]);
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
