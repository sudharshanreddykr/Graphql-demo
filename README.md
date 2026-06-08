# Graphql-demo

A federated GraphQL microservices demonstration using Apollo Gateway, Express, and PostgreSQL.

## Architecture

```text
                    Client
                       |
                       |
                GraphQL Gateway (Apollo)
                  (Port 4000)
                       |
        ---------------------------------
        |               |              |
        |               |              |
User Service      Post Service     Feed Service
 (Port 4001)       (Port 4002)      (Port 4003)
      |                 |                |
   Sequelize         Sequelize        Sequelize
      |                 |                |
  PostgreSQL        PostgreSQL       PostgreSQL
```

- **Federated Gateway**: Composes subgraphs into a single schema. Supports HTTP and WebSockets (Subscriptions).
- **Subgraphs**: Independent microservices for Users, Posts, and Feeds.
- **Subscriptions**: Real-time updates using GraphQL Subscriptions over WebSockets, backed by Redis PubSub.
- **Persistence**: PostgreSQL for production/staging, with an in-memory SQLite fallback for rapid development.
- **Caching**: Redis is used for object caching and as a PubSub transport.
- **Resilience**: Rate limiting and Circuit Breakers implemented at the Gateway.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or use the SQLite fallback)
- Redis

### Installation
1. Clone the repository.
2. Install dependencies for each service:
   ```bash
   cd user-service && npm install
   cd ../post-service && npm install
   cd ../feed-service && npm install
   cd ../gateway && npm install
   ```

### Database Setup
A standalone SQL script is provided for setting up the PostgreSQL schema and seed data.
**Path:** `sql-scripts/setup.sql`

You can run it using `psql`:
```bash
psql -h localhost -U your_user -d your_db -f sql-scripts/setup.sql
```

### Running the Services
Start each service in a separate terminal:
```bash
npm run dev # in each service directory
```

## GraphQL Subscriptions
The Gateway provides a unified WebSocket endpoint at `ws://localhost:4000/graphql`.

Available subscriptions:
- `userRegistered` (User Service)
- `postCreated` (Post Service)
- `feedCreated` (Feed Service)
