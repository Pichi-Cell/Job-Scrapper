import express from "express";
import { listAgentJobPresets, searchAgentJobPreset, } from "../services/agent-preset.service.js";
import { JOB_SOURCES } from "../services/job-search.service.js";
const DEFAULT_PORT = 3002;
const MCP_PATH = "/mcp";
const SESSION_ID = "job-scraper";
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
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((_request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
});
app.options(MCP_PATH, (_request, response) => {
    response.status(204).end();
});
app.get("/health", (_request, response) => {
    response.status(200).json({
        data: {
            status: "ok",
            transport: "http",
            mcpPath: MCP_PATH,
        },
        error: null,
    });
});
app.post(MCP_PATH, async (request, response) => {
    response.setHeader("Mcp-Session-Id", SESSION_ID);
    const payload = request.body;
    if (Array.isArray(payload)) {
        await handleBatch(payload, response);
        return;
    }
    await handleSingleMessage(payload, response);
});
app.get(MCP_PATH, (_request, response) => {
    response
        .status(405)
        .json(jsonRpcError(null, -32000, "SSE streams are not supported by this MCP server"));
});
app.use((_request, response) => {
    response.status(404).json({
        data: null,
        error: "Route not found",
    });
});
const port = Number.parseInt(process.env.MCP_PORT ?? `${DEFAULT_PORT}`, 10);
const server = app.listen(port, () => {
    console.log(`MCP HTTP server listening on http://localhost:${port}${MCP_PATH}`);
});
server.on("error", (error) => {
    console.error("[fatal] MCP server error", error);
    process.exitCode = 1;
});
async function handleBatch(messages, response) {
    if (messages.length === 0) {
        response.status(200).json(jsonRpcError(null, -32600, "Batch cannot be empty"));
        return;
    }
    const results = await Promise.all(messages.map((message) => handleJsonRpcMessage(message)));
    const responses = results.filter(isJsonRpcResponse);
    if (responses.length === 0) {
        response.status(202).end();
        return;
    }
    response.status(200).json(responses);
}
async function handleSingleMessage(message, response) {
    const result = await handleJsonRpcMessage(message);
    if (result === undefined) {
        response.status(202).end();
        return;
    }
    response.status(200).json(result);
}
async function handleJsonRpcMessage(message) {
    if (!isJsonRpcRequest(message)) {
        return jsonRpcError(null, -32600, "Invalid JSON-RPC request");
    }
    if (message.id === undefined) {
        return handleNotification(message);
    }
    try {
        return {
            jsonrpc: "2.0",
            id: message.id,
            result: await dispatchRequest(message),
        };
    }
    catch (error) {
        return jsonRpcError(message.id, getErrorCode(error), error instanceof Error ? error.message : "Internal error");
    }
}
function handleNotification(request) {
    if (request.method === "notifications/initialized") {
        return undefined;
    }
    return jsonRpcError(null, -32601, `Unsupported notification: ${request.method}`);
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
    throw new McpRequestError(-32601, `Unsupported method: ${request.method}`);
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
    throw new McpRequestError(-32602, `Unknown tool: ${toolName}`);
}
function parseSearchPresetArgs(args) {
    const searchArgs = (args ?? {});
    const preset = searchArgs.preset;
    const source = searchArgs.source;
    if (!isAgentPresetId(preset)) {
        throw new McpRequestError(-32602, "Tool argument preset must be one of: react, nodejs, fullstack, embedded");
    }
    if (source === undefined) {
        return { preset };
    }
    if (!isJobSource(source)) {
        throw new McpRequestError(-32602, `Tool argument source must be one of: ${JOB_SOURCES.join(", ")}`);
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
function isJsonRpcRequest(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const request = value;
    return request.jsonrpc === "2.0" && typeof request.method === "string";
}
function isJsonRpcResponse(value) {
    return value !== undefined;
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
function jsonRpcError(id, code, message) {
    return {
        jsonrpc: "2.0",
        id,
        error: {
            code,
            message,
        },
    };
}
function getErrorCode(error) {
    return error instanceof McpRequestError ? error.code : -32603;
}
class McpRequestError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "McpRequestError";
    }
}
