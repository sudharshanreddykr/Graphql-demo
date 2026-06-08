require("dotenv").config();

const { createServer } = require("http");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/use/ws");

const { ApolloServer } = require("apollo-server-express");
const { buildSubgraphSchema } = require("@apollo/subgraph");

const app = require("./app");
const sequelize = require("./config/db");
const redis = require("./config/redis");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolver");
const auth = require("./middleware/auth");
const createLoader = require("./loaders/userLoader");
const logger = require("./utils/logger");
const { v4: uuidv4 } = require("uuid");

async function start() {
  await sequelize.sync();

  const { client, pubsub } = redis;
  await client.connect();

  const schema = buildSubgraphSchema([{ typeDefs, resolvers }]);

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => ({
      user: auth(req),
      redis: client,
      pubsub,
      loaders: {
        userLoader: createLoader(),
      },
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
          user: null,
          redis: client,
          pubsub,
          loaders: { userLoader: createLoader() },
          traceId,
          logger: logger.child ? logger.child({ traceId }) : logger,
        };
      },
    },
    wsServer,
  );

  httpServer.listen(process.env.PORT, () => {
    console.log(`User Service Running On ${process.env.PORT}`);
  });
}

start();
