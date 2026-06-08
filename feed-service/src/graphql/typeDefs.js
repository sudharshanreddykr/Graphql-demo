const { gql } = require("apollo-server-express");

module.exports = gql`
  type Feed {
    id: ID!
    title: String!
    body: String
    userId: ID!
  }

  type Query {
    feedsByUser(userId: ID!): [Feed]
    feeds(first: Int!, after: String): FeedConnection
    allFeeds: [Feed!]!
  }

  type Subscription {
    feedCreated: Feed
  }

  type Mutation {
    createFeed(title: String!, body: String, userId: ID!): Feed
  }

  type FeedEdge {
    cursor: String!
    node: Feed!
  }

  type FeedConnection {
    edges: [FeedEdge!]!
    pageInfo: PageInfo!
  }

  type PageInfo {
    endCursor: String
    hasNextPage: Boolean!
  }
`;
