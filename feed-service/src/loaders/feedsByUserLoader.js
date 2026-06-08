const DataLoader = require('dataloader');
const Feed = require('../models/Feed');

module.exports = function createFeedsByUserLoader() {
  return new DataLoader(async (userIds) => {
    const feeds = await Feed.findAll({ where: { userId: userIds } });
    return userIds.map((id) => feeds.filter((f) => String(f.userId) === String(id)));
  });
};
