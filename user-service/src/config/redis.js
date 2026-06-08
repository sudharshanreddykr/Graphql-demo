const { createClient } = require("redis");
const { RedisPubSub } = require("graphql-redis-subscriptions");

const redisOptions = {
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
};

const client = createClient(redisOptions);

client.on("error", (err) => {
  console.log("Redis Error", err);
});

const pubsub = new RedisPubSub({
  connection: redisOptions,
});

module.exports = { client, pubsub };
