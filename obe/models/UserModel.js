import db from "../config/db.js";

export const findUser = (username, callback) => {
  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], (err, result) => {
    if (err) return callback(err, null);
    callback(null, result[0]);
  });
};
