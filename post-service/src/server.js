require("dotenv").config();

const app = require("./app");

const sequelize = require("./config/db");

const redis = require("./config/redis");

const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/use/ws");
const logger = require("./utils/logger");
const { v4: uuidv4 } = require("uuid");

const { ApolloServer } = require("apollo-server-express");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const express = require("express");

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

async function start() {
  await sequelize.authenticate();
  console.log("Postgres Connected");
  await sequelize.sync();

  const { client, pubsub } = redis;
  await client.connect();

  const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => ({
      redis: client,
      pubsub,
      traceId: req && req.traceId,
      logger: req && req.logger,
    }),
  });

  await server.start();

  app.use(express.json());
  server.applyMiddleware({ app, path: "/graphql" });

  const httpServer = createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  useServer(
    {
      schema,
      context: (ctx, msg, args) => {
        const connectionParams = ctx.connectionParams || {};
        const traceId = connectionParams["x-trace-id"] || uuidv4();
        return {
          redis: client,
          pubsub,
          traceId,
          logger: logger.child ? logger.child({ traceId }) : logger,
        };
      },
    },
    wsServer,
  );

  httpServer.listen(process.env.PORT, () => {
    console.log(`Post Service Running On ${process.env.PORT}`);
  });
}

start();
