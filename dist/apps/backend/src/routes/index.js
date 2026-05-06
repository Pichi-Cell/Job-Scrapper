import { Router } from "express";
import { fail, ok } from "../api/response.js";
import { alertsRouter } from "./alerts.routes.js";
import { jobsRouter } from "./jobs.routes.js";
export const apiRouter = Router();
apiRouter.get("/health", (_request, response) => {
    response.status(200).json(ok({ status: "ok" }));
});
apiRouter.use("/api/v1/jobs", jobsRouter);
apiRouter.use("/api/v1/alerts", alertsRouter);
apiRouter.use((_request, response) => {
    response.status(404).json(fail("Route not found"));
});
