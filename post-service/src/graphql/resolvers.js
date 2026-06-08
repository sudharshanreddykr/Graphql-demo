const { Op } = require("sequelize");
const Post = require("../models/Post");

module.exports = {
  User: {
    __resolveReference(ref) {
      return {
        id: ref.id,
      };
    },

    posts: async (user) => {
      return Post.findAll({
        where: {
          userId: user.id,
        },
      });
    },
  },
  Query: {
    post: async (_, { id }, { redis }) => {
      const key = `post:${id}`;

      const cached = await redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }

      const post = await Post.findByPk(id);

      if (post) {
        await redis.setEx(key, 300, JSON.stringify(post));
      }

      return post;
    },

    posts: async (_, { first, after }) => {
      const cursor = after ? parseInt(after, 10) : 0;
      const rows = await Post.findAll({
        where: {
          id: {
            [Op.gt]: cursor,
          },
        },
        order: [["id", "ASC"]],
        limit: first + 1,
      });

      const hasNextPage = rows.length > first;
      const posts = hasNextPage ? rows.slice(0, first) : rows;

      return {
        edges: posts.map((post) => ({
          cursor: String(post.id),
          node: post,
        })),
        pageInfo: {
          endCursor: posts.length ? String(posts[posts.length - 1].id) : null,
          hasNextPage,
        },
      };
    },
    allPosts: async () => {
      return await Post.findAll({ order: [["id", "ASC"]] });
    },

    postsByUser: async (_, { userId, first, after }) => {
      const cursor = after ? parseInt(after) : 0;

      const rows = await Post.findAll({
        where: {
          userId,
          id: {
            [Op.gt]: cursor,
          },
        },
        order: [["id", "ASC"]],
        limit: first + 1,
      });

      const hasNextPage = rows.length > first;

      const posts = hasNextPage ? rows.slice(0, first) : rows;

      return {
        edges: posts.map((post) => ({
          cursor: String(post.id),
          node: post,
        })),

        pageInfo: {
          endCursor: posts.length ? String(posts[posts.length - 1].id) : null,

          hasNextPage,
        },
      };
    },
  },

  Mutation: {
    createPost: async (_, args, { pubsub }) => {
      const post = await Post.create(args);
      pubsub.publish("POST_CREATED", { postCreated: post });
      return post;
    },
  },

  Subscription: {
    postCreated: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(["POST_CREATED"]),
    },
  },
};
