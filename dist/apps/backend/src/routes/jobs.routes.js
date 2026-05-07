import { Router } from "express";
import { handleAgentPresetJobsRequest, handleJobsRequest, } from "../api/jobs.controller.js";
export const jobsRouter = Router();
jobsRouter.get("/agent-presets/:preset", handleAgentPresetJobsRequest);
jobsRouter.get("/", handleJobsRequest);
