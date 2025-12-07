import express from "express";
import { setupEmailLogsSchema } from "../controllers/EmailLogsController.js";

const router = express.Router();

router.post("/init", setupEmailLogsSchema);

export default router;
