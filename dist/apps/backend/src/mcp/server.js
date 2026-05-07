import { stdin, stdout } from "node:process";
import { listAgentJobPresets, searchAgentJobPreset, } from "../services/agent-preset.service.js";
import { JOB_SOURCES } from "../services/job-search.service.js";
const SERVER_INFO = {
    name: "job-scraper",
    version: "0.1.0",
};
const SEARCH_PRESET_TOOL = {
    name: "search_agent_job_preset",
    description: "Search Argentina remote software engineering jobs for a preset skill. Returns up to 30 listings per source.",
    inputSchema: {
        type: "object",
        properties: {
            preset: {
                type: "string",
                enum: ["react", "nodejs", "fullstack", "embedded"],
                description: "The preset job search to run.",
            },
            source: {
                type: "string",
                enum: JOB_SOURCES,
                description: "Optional source to search. Omit to search every supported source.",
            },
        },
        required: ["preset"],
        additionalProperties: false,
    },
};
const LIST_PRESETS_TOOL = {
    name: "list_agent_job_presets",
    description: "List the job-search presets exposed by this JobScraper MCP server.",
    inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
    },
};
let buffer = "";
stdin.setEncoding("utf8");
stdin.on("data", (chunk) => {
    buffer += chunk;
    processBufferedMessages().catch((error) => {
        writeLog("error", error instanceof Error ? error.message : String(error));
    });
});
async function processBufferedMessages() {
    while (true) {
        const message = readNextMessage();
        if (message === undefined) {
            return;
        }
        await handleMessage(message);
    }
}
function readNextMessage() {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
        return undefined;
    }
    const header = buffer.slice(0, headerEnd);
    const contentLengthLine = header
        .split("\r\n")
        .find((line) => line.toLowerCase().startsWith("content-length:"));
    const lengthText = contentLengthLine?.split(":")[1]?.trim();
    const contentLength = lengthText === undefined ? Number.NaN : Number.parseInt(lengthText, 10);
    if (!Number.isInteger(contentLength) || contentLength < 0) {
        buffer = buffer.slice(headerEnd + 4);
        return JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
                code: -32700,
                message: "Invalid Content-Length header",
            },
        });
    }
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;
    if (buffer.length < messageEnd) {
        return undefined;
    }
    const message = buffer.slice(messageStart, messageEnd);
    buffer = buffer.slice(messageEnd);
    return message;
}
async function handleMessage(rawMessage) {
    let request;
    try {
        request = JSON.parse(rawMessage);
    }
    catch {
        writeResponse({
            jsonrpc: "2.0",
            id: null,
            error: {
                code: -32700,
                message: "Parse error",
            },
        });
        return;
    }
    if (request.id === undefined) {
        await handleNotification(request);
        return;
    }
    try {
        writeResponse({
            jsonrpc: "2.0",
            id: request.id,
            result: await dispatchRequest(request),
        });
    }
    catch (error) {
        writeResponse({
            jsonrpc: "2.0",
            id: request.id,
            error: {
                code: -32603,
                message: error instanceof Error ? error.message : "Internal error",
            },
        });
    }
}
async function handleNotification(request) {
    if (request.method === "notifications/initialized") {
        return;
    }
    writeLog("warning", `Ignored notification: ${request.method}`);
}
async function dispatchRequest(request) {
    if (request.method === "initialize") {
        return {
            protocolVersion: "2024-11-05",
            capabilities: {
                tools: {},
            },
            serverInfo: SERVER_INFO,
        };
    }
    if (request.method === "tools/list") {
        return {
            tools: [LIST_PRESETS_TOOL, SEARCH_PRESET_TOOL],
        };
    }
    if (request.method === "tools/call") {
        return callTool(request.params);
    }
    throw new Error(`Unsupported method: ${request.method}`);
}
async function callTool(params) {
    const toolParams = params;
    const toolName = typeof toolParams.name === "string" ? toolParams.name : "";
    if (toolName === LIST_PRESETS_TOOL.name) {
        return toolContent({
            presets: listAgentJobPresets(),
            sources: JOB_SOURCES,
            limitPerSource: 30,
        });
    }
    if (toolName === SEARCH_PRESET_TOOL.name) {
        const args = parseSearchPresetArgs(toolParams.arguments);
        return toolContent(await searchAgentJobPreset(args.preset, args.source));
    }
    throw new Error(`Unknown tool: ${toolName}`);
}
function parseSearchPresetArgs(args) {
    const searchArgs = (args ?? {});
    const preset = searchArgs.preset;
    const source = searchArgs.source;
    if (!isAgentPresetId(preset)) {
        throw new Error("Tool argument preset must be one of: react, nodejs, fullstack, embedded");
    }
    if (source === undefined) {
        return { preset };
    }
    if (!isJobSource(source)) {
        throw new Error(`Tool argument source must be one of: ${JOB_SOURCES.join(", ")}`);
    }
    return {
        preset,
        source,
    };
}
function isAgentPresetId(value) {
    return (value === "react" ||
        value === "nodejs" ||
        value === "fullstack" ||
        value === "embedded");
}
function isJobSource(value) {
    return typeof value === "string" && JOB_SOURCES.includes(value);
}
function toolContent(value) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(value, null, 2),
            },
        ],
    };
}
function writeResponse(message) {
    const payload = JSON.stringify(message);
    stdout.write(`Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`);
}
function writeLog(level, message) {
    writeResponse({
        jsonrpc: "2.0",
        method: "notifications/message",
        params: {
            level,
            logger: SERVER_INFO.name,
            data: message,
        },
    });
}
