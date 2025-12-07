import express from "express";
import AuthRoute from "./routes/AuthRoute.js";
import BadanPublikRoute from "./routes/BadanPublikRoute.js";
import "./config/db.js";

const app = express();
app.use(express.json());
app.use("/auth", AuthRoute);
app.use("/badan-publik", BadanPublikRoute);

const PORT = process.env.PORT || 8082;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
