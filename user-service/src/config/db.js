const { Sequelize } = require("sequelize");

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: process.env.SEQ_LOG === "true" ? console.log : false,
  });
} else if (process.env.DB_NAME && process.env.DB_USER) {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: "postgres",
      logging: process.env.SEQ_LOG === "true" ? console.log : false,
    },
  );
} else {
  // Fallback to in-memory sqlite for local development and seeding
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  });
}

module.exports = sequelize;
