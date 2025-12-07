import { findUser } from "../models/UserModel.js";

export const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username dan password wajib diisi" });
  }

  findUser(username, (err, user) => {
    if (err) {
      console.error("[AuthController] findUser error:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "Password salah" });
    }

    // Tentukan role: pakai kolom role jika ada, fallback ke admin/user berdasarkan username.
    const role = user.role || (user.username === "admin" ? "admin" : "user");

    res.json({
      message: "Login berhasil",
      user: {
        id: user.id,
        username: user.username,
        role
      }
    });
  });
};
