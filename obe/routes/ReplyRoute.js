import express from "express";
import { listReplies, sendReply } from "../controllers/ReplyController.js";

const router = express.Router();

router.get("/:id", listReplies); // GET /api/replies/1
router.post("/send", sendReply); // POST /api/replies/send

export default router;