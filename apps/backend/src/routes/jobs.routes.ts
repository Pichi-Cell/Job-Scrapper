import { Router } from "express";
import { handleJobsRequest } from "../api/jobs.controller.js";

export const jobsRouter = Router();

jobsRouter.get("/", handleJobsRequest);
