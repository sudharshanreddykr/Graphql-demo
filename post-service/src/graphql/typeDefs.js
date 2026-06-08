const { gql } = require("graphql-tag");

module.exports = gql`
  type Post {
    id: ID!

    title: String!

    content: String!

    userId: Int!
  }

  extend type User @key(fields: "id") {
    id: ID! @external

    posts: [Post]
  }

  type Query {
    post(id: ID!): Post
    posts(first: Int!, after: String): PostConnection
    allPosts: [Post!]!
  }

  type Mutation {
    createPost(title: String!, content: String!, userId: Int!): Post
  }

  type Subscription {
    postCreated: Post
  }

  type PostEdge {
    cursor: String!
    node: Post!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
  }

  type PageInfo {
    endCursor: String
    hasNextPage: Boolean!
  }
`;
