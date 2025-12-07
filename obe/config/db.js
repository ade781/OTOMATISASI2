import { Sequelize, QueryTypes } from "sequelize";

// 1. Koneksi Sequelize
const db = new Sequelize("oto_db", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

// Cek koneksi
db.authenticate()
  .then(() => console.log("Sequelize connected to oto_db"))
  .catch((err) => console.error("Sequelize connection error:", err));

// 2. Simpan fungsi query asli (Promise-based)
const originalQuery = db.query.bind(db);

// 3. Fungsi Legacy untuk support kode lama yang pakai callback
const legacyQuery = async (sql, params, callback) => {
  let replacements = [];
  // Normalisasi parameter
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
    // Panggil originalQuery
    const result = await originalQuery(sql, {
      replacements,
      type: queryType,
    });

    // Handle output untuk callback style
    if (callback) {
      if (isSelect) {
        callback(null, result);
      } else if (Array.isArray(result)) {
        const [, metadata] = result;
        callback(null, metadata || result[0]);
      } else {
        callback(null, result);
      }
    }
  } catch (err) {
    if (callback) callback(err, null);
  }
};

// 4. Override db.query dengan logika Hybrid (PENTING!)
db.query = function (sql, params, callback) {
  // Jika parameter ke-2 atau ke-3 adalah function, berarti ini kode lama (Callback)
  if (typeof params === 'function' || typeof callback === 'function') {
    return legacyQuery(sql, params, callback);
  }

  // Jika tidak, biarkan Sequelize bekerja secara normal (Promise)
  // Ini yang memperbaiki error 500 pada User.findOne
  return originalQuery(sql, params);
};

export default db;