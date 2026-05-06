import type { Request, Response } from "express";
import type { ScraperOptions } from "../types/scraper.js";
import { fail, ok } from "./response.js";
import {
  createAlert,
  deleteAlert,
  listAlerts,
  listNotifications,
  pollAlert,
  type AlertSourceFilter,
} from "../services/alert.service.js";
import { isSupportedSource } from "../services/job-search.service.js";
import { addPushSubscription, getPushPublicKey } from "../services/push.service.js";

export function handleAlertsList(_request: Request, response: Response): void {
  response.status(200).json(ok(listAlerts()));
}

export function handleNotificationsList(
  _request: Request,
  response: Response,
): void {
  response.status(200).json(ok(listNotifications()));
}

export function handlePushPublicKey(_request: Request, response: Response): void {
  response.status(200).json(ok(getPushPublicKey()));
}

export function handlePushSubscription(request: Request, response: Response): void {
  addPushSubscription(request.body);
  response.status(201).json(ok({ subscribed: true }));
}

export function handleCreateAlert(request: Request, response: Response): void {
  const parsed = parseCreateAlertBody(request.body);

  if (typeof parsed === "string") {
    response.status(400).json(fail(parsed));
    return;
  }

  response.status(201).json(ok(createAlert(parsed)));
}

export function handleDeleteAlert(request: Request, response: Response): void {
  const deleted = deleteAlert(getRouteParam(request.params.id));

  if (!deleted) {
    response.status(404).json(fail("Alert not found"));
    return;
  }

  response.status(200).json(ok({ deleted: true }));
}

export async function handleRunAlert(
  request: Request,
  response: Response,
): Promise<void> {
  const notification = await pollAlert(getRouteParam(request.params.id));

  response.status(200).json(ok({ notification }));
}

function getRouteParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseCreateAlertBody(body: unknown): { name: string; filters: AlertSourceFilter[] } | string {
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

  const filters: AlertSourceFilter[] = [];

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseScraperOptions(options: Record<string, unknown>): ScraperOptions {
  const parsed: ScraperOptions = {};

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

function addStringOption<K extends StringOptionKey>(
  target: ScraperOptions,
  source: Record<string, unknown>,
  key: K,
): void {
  if (typeof source[key] === "string" && source[key].trim() !== "") {
    target[key] = source[key].trim();
  }
}

function addBooleanOption<K extends BooleanOptionKey>(
  target: ScraperOptions,
  source: Record<string, unknown>,
  key: K,
): void {
  const value = source[key];

  if (typeof value === "boolean") {
    target[key] = value;
    return;
  }

  if (typeof value === "string" && ["true", "false"].includes(value)) {
    target[key] = value === "true";
  }
}

function addNumberOption<K extends NumberOptionKey>(
  target: ScraperOptions,
  source: Record<string, unknown>,
  key: K,
): void {
  const value = source[key];
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;

  if (typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0) {
    target[key] = parsed;
  }
}

type StringOptionKey = {
  [K in keyof ScraperOptions]-?: ScraperOptions[K] extends string | undefined
    ? K
    : never;
}[keyof ScraperOptions];

type BooleanOptionKey = {
  [K in keyof ScraperOptions]-?: ScraperOptions[K] extends boolean | undefined
    ? K
    : never;
}[keyof ScraperOptions];

type NumberOptionKey = {
  [K in keyof ScraperOptions]-?: ScraperOptions[K] extends number | undefined
    ? K
    : never;
}[keyof ScraperOptions];
