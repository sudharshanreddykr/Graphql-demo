                    Client
                       |
                       |
                GraphQL Gateway
                  (Apollo)
                       |
        ---------------------------------
        |               |              |
        |               |              |

User Service Post Service Feed Service
Express Express Express
GraphQL GraphQL GraphQL
| | |
Sequelize Sequelize Sequelize
| | |
PostgreSQL PostgreSQL PostgreSQL

                       |
                    Redis
                     Cache

                       |
                  DataLoader
                       |
                Batch Queries

                       |
             Cursor Pagination
