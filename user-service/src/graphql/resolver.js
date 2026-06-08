const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const User = require("../models/User");

const generateToken = require("../utils/jwt");

module.exports = {
  Query: {
    user: async (_, { id }, { redis }) => {
      const cacheKey = `user:${id}`;

      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const user = await User.findByPk(id);

      if (user) {
        await redis.setEx(cacheKey, 300, JSON.stringify(user));
      }

      return user;
    },

    users: async (_, { first, after }) => {
      const cursor = after ? parseInt(after) : 0;

      const rows = await User.findAll({
        where: {
          id: {
            [Op.gt]: cursor,
          },
        },
        limit: first + 1,
        order: [["id", "ASC"]],
      });

      const hasNextPage = rows.length > first;

      const users = hasNextPage ? rows.slice(0, first) : rows;

      return {
        edges: users.map((user) => ({
          cursor: String(user.id),
          node: user,
        })),

        pageInfo: {
          endCursor: users.length ? String(users[users.length - 1].id) : null,

          hasNextPage,
        },
      };
    },
    allUsers: async () => {
      return await User.findAll({ order: [["id", "ASC"]] });
    },
  },

  Mutation: {
    register: async (_, args, { pubsub }) => {
      const hashed = await bcrypt.hash(args.password, 10);

      const user = await User.create({
        ...args,
        password: hashed,
      });

      pubsub.publish("USER_REGISTERED", { userRegistered: user });

      return generateToken({
        id: user.id,
      });
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        throw new Error("Invalid credentials");
      }

      return generateToken({
        id: user.id,
      });
    },
  },

  Subscription: {
    userRegistered: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(["USER_REGISTERED"]),
    },
  },
};
