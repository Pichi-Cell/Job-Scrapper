import express from "express";
import { apiRouter } from "./routes/index.js";
const DEFAULT_PORT = 3001;
const app = express();
process.on("uncaughtException", (error) => {
    console.error("[fatal] uncaught exception", error);
    process.exitCode = 1;
});
process.on("unhandledRejection", (reason) => {
    console.error("[fatal] unhandled rejection", reason);
    process.exitCode = 1;
});
app.use((request, response, next) => {
    const startedAt = Date.now();
    response.on("finish", () => {
        console.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
});
app.use(express.json());
app.use(apiRouter);
const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
const server = app.listen(port, () => {
    console.log(`Backend API listening on http://localhost:${port}`);
});
server.on("error", (error) => {
    console.error("[fatal] backend server error", error);
    process.exitCode = 1;
});
