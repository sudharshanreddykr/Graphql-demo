const { Op } = require("sequelize");
const Feed = require("../models/Feed");

module.exports = {
  Query: {
    feedsByUser: async (_, { userId }, { logger, traceId }) => {
      logger?.info("Resolving feedsByUser", { traceId, userId });
      const feeds = await Feed.findAll({ where: { userId } });
      logger?.info("Resolved feedsByUser", {
        traceId,
        userId,
        count: feeds.length,
      });
      return feeds;
    },
    feeds: async (_, { first, after }, { logger, traceId }) => {
      logger?.info("Resolving feeds", { traceId, first, after });
      const cursor = after ? parseInt(after, 10) : 0;
      const rows = await Feed.findAll({
        where: {
          id: {
            [Op.gt]: cursor,
          },
        },
        order: [["id", "ASC"]],
        limit: first + 1,
      });

      const hasNextPage = rows.length > first;
      const feeds = hasNextPage ? rows.slice(0, first) : rows;

      const result = {
        edges: feeds.map((feed) => ({
          cursor: String(feed.id),
          node: feed,
        })),
        pageInfo: {
          endCursor: feeds.length ? String(feeds[feeds.length - 1].id) : null,
          hasNextPage,
        },
      };
      logger?.info("Resolved feeds", {
        traceId,
        first,
        after,
        count: feeds.length,
        hasNextPage,
      });
      return result;
    },
    allFeeds: async (_, __, { logger, traceId }) => {
      logger?.info("Resolving allFeeds", { traceId });
      const feeds = await Feed.findAll({ order: [["id", "ASC"]] });
      logger?.info("Resolved allFeeds", { traceId, count: feeds.length });
      return feeds;
    },
  },

  Mutation: {
    createFeed: async (_, args, { pubsub }) => {
      const feed = await Feed.create(args);
      pubsub.publish("FEED_CREATED", { feedCreated: feed });
      return feed;
    },
  },

  Subscription: {
    feedCreated: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(["FEED_CREATED"]),
    },
  },
};
