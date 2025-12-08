// obe/server.js
import express from "express";
import cors from "cors";
import AuthRoute from "./routes/AuthRoute.js";
import BadanPublikRoute from "./routes/BadanPublikRoute.js";
import EmailRoute from "./routes/EmailRoute.js";
import ReplyRoute from "./routes/ReplyRoute.js";
import SettingsRoute from "./routes/SettingsRoute.js";
import ImapRoute from "./routes/ImapRoute.js";
import EmailHistoryRoute from "./routes/EmailHistoryRoute.js";
import EmailLogsRoute from "./routes/EmailLogsRoute.js";
import db from "./config/db.js";

// Import all models to trigger db.sync() calls
import "./models/UserModel.js";
import "./models/BadanPublikModel.js";
import "./models/SettingsModel.js";
import "./models/EmailLogModel.js";
import "./models/ReplyModel.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", AuthRoute);
app.use("/badan-publik", BadanPublikRoute);
app.use("/api", EmailRoute);
app.use("/api/settings", SettingsRoute);
app.use("/api/replies", ReplyRoute);
app.use("/api/emails", ImapRoute);
app.use("/api/emails", EmailHistoryRoute);
app.use("/api/email-logs", EmailLogsRoute);

const PORT = process.env.PORT || 8080;

// Start server and sync all models
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Sync database (all models will sync via their individual db.sync() calls)
db.sync()
  .then(() => console.log("✓ All tables synced successfully"))
  .catch((err) => console.error("Database sync error:", err));