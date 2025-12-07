// obe/routes/EmailRoute.js
import express from "express";
import multer from "multer";
import { sendBulkEmail } from "../controllers/EmailController.js";

const router = express.Router();

// Konfigurasi Multer (Simpan di Memory/RAM sementara agar cepat)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint POST /api/send-bulk-email
// 'ktp_file' harus sama dengan nama field yang dikirim dari Frontend (FormData)
router.post("/send-bulk-email", upload.single("ktp_file"), sendBulkEmail);

export default router;