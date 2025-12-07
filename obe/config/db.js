import { Sequelize, QueryTypes } from "sequelize";

// Using Sequelize ORM instead of raw mysql2 connection
const db = new Sequelize("oto_db", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

db
  .authenticate()
  .then(() => console.log("Sequelize connected to oto_db"))
  .catch((err) => console.error("Sequelize connection error:", err));

const originalQuery = db.query.bind(db);
const legacyQuery = async (sql, params, callback) => {
  let replacements = [];
  if (typeof params === "function") {
    callback = params;
    replacements = [];
  } else if (Array.isArray(params)) {
    replacements = params;
  } else if (params && typeof params === "object") {
    replacements = params;
  }

  const command = sql.trim().split(" ")[0]?.toLowerCase();
  const isSelect = command === "select";
  const queryType = isSelect ? QueryTypes.SELECT : QueryTypes.RAW;

  try {
    const result = await originalQuery(sql, {
      replacements,
      type: queryType,
    });

    if (isSelect) {
      callback(null, result);
      return;
    }

    if (Array.isArray(result)) {
      const [, metadata] = result;
      callback(null, metadata || result[0]);
    } else {
      callback(null, result);
    }
  } catch (err) {
    callback(err, null);
  }
};

db.query = (sql, params, callback) => legacyQuery(sql, params, callback);

export default db;
