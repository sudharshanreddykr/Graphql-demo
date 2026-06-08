# Project Architecture - Graphql-demo

Overview:

- The system is a federated GraphQL setup using Apollo Gateway and multiple subgraphs:
  - `user-service` (port 4001)
  - `post-service` (port 4002)
  - `feed-service` (port 4003)
  - `gateway` (port 4000)

- Each subgraph exposes Query/Mutation/Subscription capabilities and uses `buildSubgraphSchema` (`@apollo/subgraph`).
- Subscriptions are implemented locally in each subgraph using `graphql-ws` and `ws`.
- Redis is used as the pub/sub transport via `graphql-redis-subscriptions` so that published events propagate across instances.
- The gateway composes subgraphs via `IntrospectAndCompose`, and it now polls the subgraphs periodically so schema changes refresh automatically.
- For subscriptions, a lightweight WebSocket proxy is attached to the gateway HTTP server at `/graphql` which forwards the websocket connection to the most likely subgraph based on the initial GraphQL operation (a heuristic). This enables Studio or other clients to connect to `ws://localhost:4000/graphql` for single-subgraph subscriptions.

Resilience & Observability:

- Rate limiting: `express-rate-limit` on the gateway (`/graphql`) to protect from request floods.
- Circuit breaker: `opossum` wraps downstream RemoteGraphQLDataSource calls to handle failing subgraphs gracefully.
- Tracing: `x-trace-id` header generated at gateway and propagated to subgraphs; services attach the trace id to logger via `logger.child({ traceId })`.
- Structured logging: `winston` configured to log to console and per-service log files in `logs/`.

Flow (high-level):

1. Client -> Gateway HTTP POST `/graphql`:
   - Gateway composes supergraph and forwards sub-requests to subgraphs using `RemoteGraphQLDataSource`.
   - Gateway attaches `x-trace-id` and logs the request.

2. Client -> Gateway WS `ws://localhost:4000/graphql` (subscription):
   - Gateway accepts websocket, inspects first message to pick subgraph, opens backend websocket to that subgraph, and proxies frames.
   - Subgraph `graphql-ws` server handles subscriptions and uses `RedisPubSub` to deliver events.

3. Subgraph publishes an event (e.g., `pubsub.publish('POST_CREATED', { postCreated: post })`):
   - RedisPubSub broadcasts to all subscribers across services.

Limitations & Next Improvements:

- Gateway WS proxy uses a simple heuristic and only forwards to a single subgraph per connection. For federated subscriptions or queries that span types from multiple subgraphs, a gateway-level subscription orchestration is required (non-trivial).
- Consider adding authentication propagation for WS connections (inspect `connectionParams.authorization` and validate tokens during WS context creation).
- Add server-side caps for `all*` queries to avoid heavy responses.
- Improve WS proxy health checks and error messages when backend WS is not reachable.
