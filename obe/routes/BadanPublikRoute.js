import express from "express";
import {
    getBadanPublik,
    createBadanPublik,
    updateBadanPublik,
    deleteBadanPublik
} from "../controllers/BadanPublikController.js";

const router = express.Router();

router.get("/", getBadanPublik);
router.post("/", createBadanPublik);       // Create
router.put("/:id", updateBadanPublik);     // Update
router.delete("/:id", deleteBadanPublik);  // Delete

export default router;