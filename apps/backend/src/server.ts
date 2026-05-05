import { createServer } from "node:http";
import { handleJobsRequest } from "./api/jobs.controller.js";
import { ok, fail } from "./api/response.js";

const DEFAULT_PORT = 3000;

const server = createServer(async (request, response) => {
  const host = request.headers.host ?? `localhost:${DEFAULT_PORT}`;
  const url = new URL(request.url ?? "/", `http://${host}`);

  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(ok({ status: "ok" })));
    return;
  }

  if (url.pathname === "/api/v1/jobs") {
    await handleJobsRequest(request, response, url);
    return;
  }

  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(fail("Route not found")));
});

const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);

server.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});

