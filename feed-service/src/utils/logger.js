const { createLogger, format, transports } = require("winston");
const path = require("path");
const { combine, timestamp, printf } = format;

const logFormat = printf(({ timestamp, level, message, traceId, ...meta }) => {
  const tid = traceId ? ` [trace:${traceId}]` : "";
  const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} ${level}:${tid} ${message}${rest}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(__dirname, "../../logs/feed-service.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
      format: combine(timestamp(), logFormat),
    }),
  ],
});

module.exports = logger;
