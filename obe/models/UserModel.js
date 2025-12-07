import { DataTypes } from "sequelize";
import db from "../config/db.js";

const User = db.define(
  "users",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "user" },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);

export const findUser = (username, callback) => {
  console.log("[UserModel] findUser called with username:", username);
  User.findOne({ where: { username } })
    .then((user) => {
      console.log("[UserModel] findUser result:", user ? "user found" : "user not found");
      callback(null, user);
    })
    .catch((err) => {
      console.error("[UserModel] findUser error:", err);
      callback(err, null);
    });
};

export default User;
