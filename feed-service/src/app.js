require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const logger = require("./utils/logger");

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const traceId = req.headers["x-trace-id"] || uuidv4();
  req.traceId = traceId;
  req.logger = logger.child ? logger.child({ traceId }) : logger;
  res.setHeader("x-trace-id", traceId);
  req.logger.info(`incoming ${req.method} ${req.path}`);
  next();
});

module.exports = app;
