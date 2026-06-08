const DataLoader = require("dataloader");
const User = require("../models/user");

module.exports = () =>
  new DataLoader(async (ids) => {
    const users = await User.findAll({
      where: {
        id: ids,
      },
    });

    const map = {};

    users.forEach((user) => {
      map[user.id] = user;
    });

    return ids.map((id) => map[id]);
  });
