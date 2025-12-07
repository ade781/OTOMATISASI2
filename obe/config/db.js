import mysql from "mysql2";

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "oto_db"
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL connected to oto_db");
});

export default db;
