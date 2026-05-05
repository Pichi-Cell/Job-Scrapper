import express from "express";
import { apiRouter } from "./routes/index.js";
const DEFAULT_PORT = 3000;
const app = express();
app.use(express.json());
app.use(apiRouter);
const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
app.listen(port, () => {
    console.log(`Backend API listening on http://localhost:${port}`);
});
