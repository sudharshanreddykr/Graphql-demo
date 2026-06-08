# GraphQL APIs - Graphql-demo

This document lists the GraphQL APIs exposed by each subgraph and the gateway.

## Gateway

- HTTP endpoint: `http://localhost:4000/graphql`
- WebSocket endpoint: `ws://localhost:4000/graphql`
- Secure WebSocket endpoint (optional): `wss://localhost:4000/graphql`

The gateway composes the `user`, `post`, and `feed` subgraphs using Apollo Federation.

> Use `wss://` when connecting from a secure browser origin. Set `SSL_KEY_PATH` and `SSL_CERT_PATH` in the gateway environment to enable TLS, which also enables secure WebSocket transport.

## User Service (subgraph)

- HTTP endpoint: `http://localhost:4001/graphql`
- WebSocket endpoint: `ws://localhost:4001/graphql`

Types and operations:

- Type `User { id, name, email }`
- Queries:
  - `user(id: ID!): User`
  - `users(first: Int!, after: String): UserConnection` (cursor pagination)
  - `allUsers: [User!]!`
- Mutations:
  - `register(name: String!, email: String!, password: String!): String`
  - `login(email: String!, password: String!): String`
- Subscriptions:
  - `userRegistered: User`

Example subscription (graphql-ws client):

```
subscription OnUserRegistered {
  userRegistered {
    id
    name
    email
  }
}
```

## Post Service (subgraph)

- HTTP endpoint: `http://localhost:4002/graphql`
- WebSocket endpoint: `ws://localhost:4002/graphql`

Types and operations:

- Type `Post { id, title, content, userId }`
- Queries:
  - `post(id: ID!): Post`
  - `posts(first: Int!, after: String): PostConnection` (cursor pagination)
  - `allPosts: [Post!]!`
  - `postsByUser(userId: ID!, first: Int!, after: String): PostConnection`
- Mutations:
  - `createPost(title: String!, content: String!, userId: Int!): Post`
- Subscriptions:
  - `postCreated: Post`

## Feed Service (subgraph)

- HTTP endpoint: `http://localhost:4003/graphql`
- WebSocket endpoint: `ws://localhost:4003/graphql`

Types and operations:

- Type `Feed { id, title, body, userId }`
- Queries:
  - `feedsByUser(userId: ID!): [Feed]`
  - `feeds(first: Int!, after: String): FeedConnection` (cursor pagination)
  - `allFeeds: [Feed!]!`
- Mutations:
  - `createFeed(title: String!, body: String, userId: ID!): Feed`
- Subscriptions:
  - `feedCreated: Feed`

## Notes

- Non-paginated `allUsers`, `allPosts`, and `allFeeds` exist for convenience. In production, apply limits to avoid large payloads.
- Subscriptions use Redis-based `RedisPubSub` to propagate events between instances.
- The project uses `graphql-ws/use/ws` for GraphQL WebSocket transport in the current CommonJS service setup.
