const sequelize = require("../../src/config/db");
const User = require("../models/user");
const bcrypt = require("bcryptjs");

async function seed() {
  await sequelize.sync({ force: true });

  const users = [
    { name: "Alice", email: "alice@example.com", password: "password1" },
    { name: "Bob", email: "bob@example.com", password: "password2" },
    { name: "Carol", email: "carol@example.com", password: "password3" },
  ];

  for (const u of users) {
    await User.create({
      name: u.name,
      email: u.email,
      password: await bcrypt.hash(u.password, 10),
    });
  }

  console.log("Seeded users");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
