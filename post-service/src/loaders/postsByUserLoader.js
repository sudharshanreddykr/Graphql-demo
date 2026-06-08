const DataLoader = require("dataloader");
const Post = require("../models/Post");

module.exports = () =>
  new DataLoader(async (userIds) => {
    const posts = await Post.findAll({
      where: {
        userId: userIds,
      },
    });

    return userIds.map((id) => posts.filter((post) => post.userId === id));
  });
