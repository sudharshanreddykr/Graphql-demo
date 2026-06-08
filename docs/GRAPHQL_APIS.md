# GraphQL APIs - Graphql-demo

This document lists the GraphQL APIs exposed by each subgraph and the gateway.

## Gateway

- HTTP endpoint: `http://localhost:4000/graphql`
- WebSocket endpoint (proxy for subscriptions): `ws://localhost:4000/graphql`
- Secure WebSocket endpoint (optional): `wss://localhost:4000/graphql`

The gateway composes the `user`, `post`, and `feed` subgraphs using Apollo Federation.

> Use `wss://` when connecting from a secure browser origin such as Apollo Studio. Set `SSL_KEY_PATH` and `SSL_CERT_PATH` in the gateway environment to enable TLS.

## User Service (subgraph)

- HTTP endpoint: `http://localhost:4001/graphql`
- WebSocket endpoint: `ws://localhost:4001/graphql`

Types and operations:

- Type `User { id, name, email }`
- Queries:
  - `user(id: ID!): User`
  - `users(first: Int!, after: String): UserConnection` (cursor pagination)
  - `allUsers: [User!]!` (non-paginated)
- Mutations:
  - `register(...) : String` (returns token)
  - `login(email, password) : String` (returns token)
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
  - `createPost(title, content, userId): Post`
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
  - `createFeed(title, body, userId): Feed`
- Subscriptions:
  - `feedCreated: Feed`

## Notes

- Non-paginated `allUsers`, `allPosts`, `allFeeds` exist for convenience. Consider adding server-side limits in production to prevent huge payloads.
- Subscriptions use Redis-based `RedisPubSub` to propagate events between instances.
