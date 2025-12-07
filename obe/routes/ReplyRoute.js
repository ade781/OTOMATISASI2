import express from "express";
import { listReplies } from "../controllers/ReplyController.js";

const router = express.Router();

router.get("/:id", listReplies); // GET /api/replies/1

export default router;