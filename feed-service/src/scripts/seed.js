const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");

async function seed() {
  let sequelize;
  let Feed;

  try {
    // try to use configured DB
    sequelize = require("../../src/config/db");
    await sequelize.authenticate();
    Feed = require("../models/Feed");
    await sequelize.sync({ force: true });
  } catch (err) {
    // fallback to local sqlite in-memory
    console.warn(
      "Configured DB not available, falling back to sqlite in-memory for seeding:",
      err.message || err,
    );
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
    });
    Feed = sequelize.define(
      "Feed",
      {
        title: { type: DataTypes.STRING, allowNull: false },
        body: { type: DataTypes.TEXT },
        userId: { type: DataTypes.INTEGER, allowNull: false },
      },
      { tableName: "feeds" },
    );
    await sequelize.sync({ force: true });
  }

  const feeds = [
    { title: "Feed One", body: "Hello feed 1", userId: 1 },
    { title: "Feed Two", body: "Hello feed 2", userId: 2 },
  ];

  for (const f of feeds) {
    await Feed.create(f);
  }

  console.log("Seeded feeds");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
