// obe/server.js
import express from "express";
import cors from "cors"; // Import CORS
import AuthRoute from "./routes/AuthRoute.js";
import BadanPublikRoute from "./routes/BadanPublikRoute.js";
import EmailRoute from "./routes/EmailRoute.js"; // Import Route Email
import "./config/db.js";
import ReplyRoute from "./routes/ReplyRoute.js";
import SettingsRoute from "./routes/SettingsRoute.js";

const app = express();

// Middleware
app.use(cors()); // Izinkan frontend mengakses backend
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Untuk parsing form data urlencoded jika perlu

// Routes
app.use("/auth", AuthRoute);
app.use("/badan-publik", BadanPublikRoute);
app.use("/api", EmailRoute);
app.use("/api/settings", SettingsRoute);
app.use("/api/replies", ReplyRoute);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});