const sequelize = require("../../src/config/db");
const Post = require("../models/Post");

async function seed() {
  await sequelize.sync({ force: true });

  const posts = [
    { title: "Hello World", content: "First post", userId: 1 },
    { title: "Second Post", content: "Another post", userId: 1 },
    { title: "Bob Post", content: "Bob lives here", userId: 2 },
  ];

  for (const p of posts) {
    await Post.create(p);
  }

  console.log("Seeded posts");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
