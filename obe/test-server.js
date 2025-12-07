console.log("1. Starting...");

import express from "express";
console.log("2. Express imported");

import "./config/db.js";
console.log("3. DB config imported");

const app = express();
console.log("4. App created");

app.use(express.json());
console.log("5. Middleware added");

app.post("/auth/login", (req, res) => {
    console.log("6. Login route handler called with body:", req.body);
    const { username, password } = req.body;

    if (username === "admin" && password === "aaa") {
        res.json({ message: "Login berhasil", user: { id: 1, username: "admin", role: "admin" } });
    } else {
        res.status(401).json({ message: "Password salah" });
    }
});

console.log("7. Routes added");

const PORT = 8888;
app.listen(PORT, () => {
    console.log(`8. Server running on port ${PORT}`);
});

console.log("9. Listen called");