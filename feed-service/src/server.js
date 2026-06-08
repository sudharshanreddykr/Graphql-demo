require("dotenv").config();

const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/use/ws");
const app = require("./app");
const { ApolloServer } = require("apollo-server-express");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const logger = require("./utils/logger");
const sequelize = require("./config/db");
const { client: redisClient, pubsub } = require("./config/redis");
const { v4: uuidv4 } = require("uuid");

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

async function start() {
  try {
    await sequelize.sync();
    logger.info("Database synced successfully");
  } catch (err) {
    logger.warn("Database sync failed, continuing without DB:", {
      error: err.message || err,
    });
  }

  try {
    await redisClient.connect();
    logger.info("Redis connected successfully");
  } catch (err) {
    logger.warn("Redis connect failed, continuing without Redis:", {
      error: err.message || err,
    });
  }

  const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => ({
      redis: redisClient,
      pubsub,
      traceId: req && req.traceId,
      logger: req && req.logger,
    }),
  });

  await server.start();
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
          redis: redisClient,
          pubsub,
          traceId,
          logger: logger.child ? logger.child({ traceId }) : logger,
        };
      },
    },
    wsServer,
  );

  const port = process.env.PORT || 4003;
  httpServer.listen(port, () => {
    logger.info(`Feed Service running on ${port}`);
  });
}

start();
