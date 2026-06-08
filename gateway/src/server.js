require("dotenv").config();

const express = require("express");
const rateLimit = require("express-rate-limit");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const {
  ApolloGateway,
  RemoteGraphQLDataSource,
  IntrospectAndCompose,
} = require("@apollo/gateway");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const CircuitBreaker = require("opossum");
const { createServer } = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const { WebSocketServer } = WebSocket;
const { useServer } = require("graphql-ws/use/ws");

const logger = require("./utils/logger");

const PORT = process.env.PORT || 4000;
const RATE_WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || "60000", 10);
const RATE_MAX = parseInt(process.env.RATE_MAX || "100", 10);
const POLL_INTERVAL_MS = parseInt(
  process.env.GATEWAY_POLL_INTERVAL_MS || "30000",
  10,
);
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_PASSPHRASE = process.env.SSL_PASSPHRASE;
const USE_HTTPS = SSL_KEY_PATH && SSL_CERT_PATH;

const circuitOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 15000,
  rollingCountTimeout: 10000,
  rollingCountBuckets: 5,
};

function createCircuitBreaker(name, url) {
  const breaker = new CircuitBreaker(async (request, requestContext) => {
    return RemoteGraphQLDataSource.prototype.process.call(
      this,
      request,
      requestContext,
    );
  }, circuitOptions);

  breaker.name = name;
  breaker.on("open", () => logger.warn(`Circuit open for ${name}`, { url }));
  breaker.on("halfOpen", () =>
    logger.info(`Circuit half-open for ${name}`, { url }),
  );
  breaker.on("close", () => logger.info(`Circuit closed for ${name}`, { url }));
  breaker.on("fallback", () =>
    logger.warn(`Circuit fallback triggered for ${name}`, { url }),
  );

  return breaker;
}

class CircuitBreakerDataSource extends RemoteGraphQLDataSource {
  constructor({ url, name }) {
    super({ url });
    this.name = name;
    this.breaker = new CircuitBreaker(
      async (request, requestContext) =>
        RemoteGraphQLDataSource.prototype.process.call(
          this,
          request,
          requestContext,
        ),
      circuitOptions,
    );

    this.breaker.on("open", () =>
      logger.warn(`Circuit open for ${name}`, { url }),
    );
    this.breaker.on("halfOpen", () =>
      logger.info(`Circuit half-open for ${name}`, { url }),
    );
    this.breaker.on("close", () =>
      logger.info(`Circuit closed for ${name}`, { url }),
    );
  }

  async process(request, requestContext) {
    try {
      return await this.breaker.fire(request, requestContext);
    } catch (error) {
      logger.error(`Downstream request failed for ${this.name}`, {
        traceId: requestContext?.request?.http?.headers.get("x-trace-id"),
        error: error.message,
      });
      throw error;
    }
  }
}

const subgraphs = [
  {
    name: "user",
    url: process.env.USER_SERVICE_URL || "http://localhost:4001/graphql",
  },
  {
    name: "post",
    url: process.env.POST_SERVICE_URL || "http://localhost:4002/graphql",
  },
  {
    name: "feed",
    url: process.env.FEED_SERVICE_URL || "http://localhost:4003/graphql",
  },
];

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs,
    pollIntervalInMs: POLL_INTERVAL_MS,
    logger,
    subgraphHealthCheck: true,
  }),
  buildService({ name, url }) {
    return new CircuitBreakerDataSource({ url, name });
  },
});

const limiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const traceId = req.traceId || uuidv4();
    logger.warn("Rate limit exceeded", { traceId, path: req.path, ip: req.ip });
    res.status(429).json({
      error: "Too many requests",
      traceId,
    });
  },
});

async function ensureGatewayIsReady(attempts = 10, intervalMs = 3000) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await gateway.load();
      logger.info("Gateway successfully loaded federated subgraphs");
      return;
    } catch (err) {
      lastError = err;
      logger.warn(`Gateway load attempt ${attempt} failed`, {
        error: err.message || err,
      });
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  }

  throw lastError;
}

async function start() {
  const app = express();

  app.use(express.json());
  app.use(cors({ origin: true, credentials: true }));

  app.use((req, res, next) => {
    const traceId = req.headers["x-trace-id"] || uuidv4();
    req.traceId = traceId;
    req.logger = logger.child ? logger.child({ traceId }) : logger;
    res.setHeader("x-trace-id", traceId);
    req.logger.info(`incoming request ${req.method} ${req.path}`);
    next();
  });

  app.use("/graphql", limiter);

  app.get("/health", (req, res) => {
    res.json({ status: "ok", traceId: req.traceId });
  });

  app.get("/ready", (req, res) => {
    res.json({
      status: "ready",
      services: subgraphs.map((s) => s.name),
      traceId: req.traceId,
    });
  });

  const server = new ApolloServer({
    gateway,
    introspection: true,
    plugins: [
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(ctx) {
              logger.error("GraphQL errors encountered", {
                traceId: ctx.request?.http?.headers.get("x-trace-id"),
                errors: ctx.errors?.map((e) => e.message),
              });
            },
          };
        },
      },
    ],
  });

  await server.start();
  app.use("/graphql", expressMiddleware(server));

  // Create an HTTP server so we can attach a WebSocket server for subscriptions
  const httpServer = USE_HTTPS
    ? https.createServer(
        {
          key: fs.readFileSync(path.resolve(SSL_KEY_PATH), "utf8"),
          cert: fs.readFileSync(path.resolve(SSL_CERT_PATH), "utf8"),
          ...(SSL_PASSPHRASE ? { passphrase: SSL_PASSPHRASE } : {}),
        },
        app,
      )
    : createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  // Use the gateway schema and executor (already loaded by ApolloServer)
  const schema = gateway.schema;
  const executor = gateway.executor;

  useServer(
    {
      schema,
      execute: executor,
      subscribe: executor,
      onConnect: (ctx) => {
        logger.info("WS Connected", {
          traceId: ctx.connectionParams?.["x-trace-id"] || "new-ws-conn",
        });
      },
    },
    wsServer,
  );

  const protocol = USE_HTTPS ? "https" : "http";
  const wsProtocol = USE_HTTPS ? "wss" : "ws";

  httpServer.listen(PORT, () => {
    logger.info(`Gateway Running On ${protocol}://localhost:${PORT}`);
    logger.info(
      `Gateway WebSocket endpoint available at ${wsProtocol}://localhost:${PORT}/graphql`,
    );
  });
}

start().catch((err) => {
  logger.error("Failed to start gateway", { error: err.message || err });
  process.exit(1);
});
