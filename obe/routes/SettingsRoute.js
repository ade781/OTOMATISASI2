// obe/routes/SettingsRoute.js
import express from "express";
import { updateEmailSettings, getUserSettings } from "../controllers/SettingsController.js";

const router = express.Router();

router.post("/update", updateEmailSettings);
router.get("/", getUserSettings);

export default router;