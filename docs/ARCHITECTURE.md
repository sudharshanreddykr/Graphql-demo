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
- For subscriptions, the gateway uses `graphql-ws` and the Apollo Gateway `executor` to route subscription requests to the appropriate subgraphs. This provides a unified subscription endpoint at `ws://localhost:4000/graphql`.

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
   - Gateway handles the WebSocket connection using `graphql-ws`.
   - Requests are routed to subgraphs via the Gateway `executor`.
   - Subgraph `graphql-ws` servers handle the local subscription and use `RedisPubSub` to deliver events.

3. Subgraph publishes an event (e.g., `pubsub.publish('POST_CREATED', { postCreated: post })`):
   - RedisPubSub broadcasts to all subscribers across services.

Limitations & Next Improvements:

- While the gateway now handles subscriptions more robustly, federated subscriptions (where a subscription root field is resolved by multiple subgraphs) still require careful schema design.
- Consider adding authentication propagation for WS connections (inspect `connectionParams.authorization` and validate tokens during WS context creation).
- Add server-side caps for `all*` queries to avoid heavy responses.
