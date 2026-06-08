const { createClient } = require("redis");
const { RedisPubSub } = require("graphql-redis-subscriptions");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const client = createClient({ url: redisUrl });

const pubsub = new RedisPubSub({
  connection: redisUrl,
});

module.exports = { client, pubsub };
