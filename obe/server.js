import express from "express";
import AuthRoute from "./routes/AuthRoute.js";
import "./config/db.js";

const app = express();
app.use(express.json());
app.use("/auth", AuthRoute);

app.listen(8081, () => {
  console.log("Server running on port 8081");
});
