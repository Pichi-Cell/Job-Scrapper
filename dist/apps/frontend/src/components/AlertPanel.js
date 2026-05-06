import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, BellRing, Trash2 } from "lucide-react";
export function AlertPanel({ filters, alerts, notifications, error, isSaving, onCreateAlert, onRemoveAlert, onEnableNotifications, }) {
    async function handleCreateAlert(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("alertName") ?? "").trim();
        if (name !== "") {
            await onCreateAlert(name, filters);
            event.currentTarget.reset();
        }
    }
    return (_jsxs("section", { className: "alerts-panel", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: "Position Alerts" }), _jsx("p", { children: "Polls every 6 hours using the current filter set." })] }), _jsx("button", { className: "icon-button", title: "Enable background notifications", type: "button", onClick: () => void onEnableNotifications(), children: _jsx(Bell, { size: 18 }) })] }), _jsxs("form", { className: "alert-create", onSubmit: (event) => void handleCreateAlert(event), children: [_jsx("input", { name: "alertName", placeholder: "Alert name" }), _jsxs("button", { disabled: isSaving, type: "submit", children: [_jsx(BellRing, { size: 16 }), "Save"] })] }), error !== null ? _jsx("p", { className: "alert-error", children: error }) : null, _jsx("div", { className: "alert-list", children: alerts.map((alert) => (_jsxs("article", { className: "alert-item", children: [_jsxs("div", { children: [_jsx("strong", { children: alert.name }), _jsx("span", { children: alert.filters.map((filter) => filter.source.toUpperCase()).join(", ") }), _jsx("small", { children: alert.lastCheckedAt === null
                                        ? "Preparing first run"
                                        : `${alert.lastMatchCount} matches last run` })] }), _jsx("button", { className: "icon-button", title: "Delete alert", type: "button", onClick: () => void onRemoveAlert(alert.id), children: _jsx(Trash2, { size: 16 }) })] }, alert.id))) }), notifications.length > 0 ? (_jsx("div", { className: "notification-list", children: notifications.slice(0, 5).map((notification) => (_jsxs("article", { className: "notification-item", children: [_jsx("strong", { children: notification.alertName }), _jsxs("span", { children: [notification.jobs.length, " new positions"] })] }, notification.id))) })) : null] }));
}
