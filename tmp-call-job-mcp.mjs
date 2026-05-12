import { spawn } from "node:child_process";

const cwd = process.cwd();

function encode(message) {
  const payload = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`;
}

function parseMessages(buffer, messages) {
  let remaining = buffer;

  while (true) {
    const headerEnd = remaining.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return remaining;
    }

    const header = remaining.slice(0, headerEnd);
    const lengthMatch = /content-length:\s*(\d+)/i.exec(header);

    if (lengthMatch === null) {
      throw new Error(`Invalid MCP header: ${header}`);
    }

    const contentLength = Number(lengthMatch[1]);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;

    if (remaining.length < messageEnd) {
      return remaining;
    }

    messages.push(JSON.parse(remaining.slice(messageStart, messageEnd)));
    remaining = remaining.slice(messageEnd);
  }
}

const presets = process.argv.slice(2);
const requests = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "codex", version: "1.0.0" },
    },
  },
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "list_agent_job_presets", arguments: {} },
  },
  ...presets.map((preset, index) => ({
    jsonrpc: "2.0",
    id: index + 4,
    method: "tools/call",
    params: {
      name: "search_agent_job_preset",
      arguments: { preset },
    },
  })),
];

const child = spawn("node", ["dist/apps/backend/src/mcp/server.js"], {
  cwd,
  stdio: ["pipe", "pipe", "pipe"],
});

const messages = [];
let stdoutBuffer = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
  stdoutBuffer = parseMessages(stdoutBuffer + chunk.toString("utf8"), messages);
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

for (const request of requests) {
  child.stdin.write(encode(request));
}

setTimeout(() => {
  child.kill();
  console.log(JSON.stringify({ messages, stderr }, null, 2));
}, 45000);
