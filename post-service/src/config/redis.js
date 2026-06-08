const { createClient } = require("redis");
const { RedisPubSub } = require("graphql-redis-subscriptions");

const client = createClient();

const pubsub = new RedisPubSub();

module.exports = { client, pubsub };
