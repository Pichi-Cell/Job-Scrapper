import { fail, ok } from "./response.js";
import { createAlert, deleteAlert, listAlerts, listNotifications, pollAlert, } from "../services/alert.service.js";
import { isSupportedSource } from "../services/job-search.service.js";
import { addPushSubscription, getPushPublicKey } from "../services/push.service.js";
export function handleAlertsList(_request, response) {
    response.status(200).json(ok(listAlerts()));
}
export function handleNotificationsList(_request, response) {
    response.status(200).json(ok(listNotifications()));
}
export function handlePushPublicKey(_request, response) {
    response.status(200).json(ok(getPushPublicKey()));
}
export function handlePushSubscription(request, response) {
    addPushSubscription(request.body);
    response.status(201).json(ok({ subscribed: true }));
}
export function handleCreateAlert(request, response) {
    const parsed = parseCreateAlertBody(request.body);
    if (typeof parsed === "string") {
        response.status(400).json(fail(parsed));
        return;
    }
    response.status(201).json(ok(createAlert(parsed)));
}
export function handleDeleteAlert(request, response) {
    const deleted = deleteAlert(getRouteParam(request.params.id));
    if (!deleted) {
        response.status(404).json(fail("Alert not found"));
        return;
    }
    response.status(200).json(ok({ deleted: true }));
}
export async function handleRunAlert(request, response) {
    const notification = await pollAlert(getRouteParam(request.params.id));
    response.status(200).json(ok({ notification }));
}
function getRouteParam(value) {
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
function parseCreateAlertBody(body) {
    if (!isObject(body)) {
        return "Alert request body must be an object";
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name === "") {
        return "Alert name is required";
    }
    if (!Array.isArray(body.filters) || body.filters.length === 0) {
        return "At least one source filter is required";
    }
    const filters = [];
    for (const item of body.filters) {
        if (!isObject(item) || typeof item.source !== "string") {
            return "Every filter must include a source";
        }
        if (!isSupportedSource(item.source)) {
            return `Unsupported source: ${item.source}`;
        }
        filters.push({
            source: item.source,
            options: isObject(item.options) ? parseScraperOptions(item.options) : {},
        });
    }
    return {
        name,
        filters,
    };
}
function isObject(value) {
    return typeof value === "object" && value !== null;
}
function parseScraperOptions(options) {
    const parsed = {};
    addStringOption(parsed, options, "query");
    addStringOption(parsed, options, "location");
    addStringOption(parsed, options, "country");
    addStringOption(parsed, options, "careerArea");
    addStringOption(parsed, options, "experienceLevel");
    addStringOption(parsed, options, "profile");
    addStringOption(parsed, options, "skills");
    addStringOption(parsed, options, "targetLevel");
    addStringOption(parsed, options, "businessArea");
    addStringOption(parsed, options, "remoteType");
    addStringOption(parsed, options, "yearsOfExperience");
    addStringOption(parsed, options, "employeeType");
    addStringOption(parsed, options, "specialization");
    addStringOption(parsed, options, "category");
    addBooleanOption(parsed, options, "remote");
    addBooleanOption(parsed, options, "hasPublicSalary");
    addBooleanOption(parsed, options, "includeClosed");
    addNumberOption(parsed, options, "pageSize");
    addNumberOption(parsed, options, "maxPages");
    return parsed;
}
function addStringOption(target, source, key) {
    if (typeof source[key] === "string" && source[key].trim() !== "") {
        target[key] = source[key].trim();
    }
}
function addBooleanOption(target, source, key) {
    const value = source[key];
    if (typeof value === "boolean") {
        target[key] = value;
        return;
    }
    if (typeof value === "string" && ["true", "false"].includes(value)) {
        target[key] = value === "true";
    }
}
function addNumberOption(target, source, key) {
    const value = source[key];
    const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
    if (typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0) {
        target[key] = parsed;
    }
}
