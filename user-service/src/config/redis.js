const { createClient } = require("redis");
const { RedisPubSub } = require("graphql-redis-subscriptions");

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const client = createClient({ url: redisUrl });

client.on("error", (err) => {
  console.log("Redis Error", err);
});

const pubsub = new RedisPubSub({
  connection: redisUrl,
});

module.exports = { client, pubsub };
