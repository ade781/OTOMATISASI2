import express from "express";
import { listBadanPublik } from "../controllers/BadanPublikController.js";

const router = express.Router();
router.get("/", listBadanPublik);

export default router;
