const { gql } = require("graphql-tag");

module.exports = gql`
  type User @key(fields: "id") {
    id: ID!

    name: String!

    email: String!
  }
  type Query {
    user(id: ID!): User
    users(first: Int!, after: String): UserConnection
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): String
    login(email: String!, password: String!): String
  }

  type Subscription {
    userRegistered: User
  }

  type UserEdge {
    cursor: String!
    node: User!
  }

  type PageInfo {
    endCursor: String
    hasNextPage: Boolean!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
  }
`;
