import winston from "winston";
import { maskSensitiveData } from "./maskSensitiveData";

const generalLogFormat = winston.format.printf((info) => {
  const { timestamp, level, message, ...rest } = info;
  let formattedMessage = message;

  if (typeof message === "object" && message !== null) {
    formattedMessage = JSON.stringify(maskSensitiveData(message));
  } else if (typeof message === "string" && Object.keys(rest).length > 0) {
    formattedMessage = `${message} ${JSON.stringify(maskSensitiveData(rest))}`;
  } else if (Object.keys(rest).length > 0) {
    formattedMessage = JSON.stringify(maskSensitiveData(rest));
  }
  return `[${timestamp}] ${level}: ${formattedMessage}`;
});

const errorLogFormat = winston.format.printf((info) => {
  const { timestamp, level, message, stack, ...rest } = info;
  let formattedMessage = message;

  if (typeof message === "object" && message !== null) {
    formattedMessage = JSON.stringify(maskSensitiveData(message));
  } else if (typeof message === "string" && Object.keys(rest).length > 0) {
    formattedMessage = `${message} ${JSON.stringify(maskSensitiveData(rest))}`;
  } else if (Object.keys(rest).length > 0) {
    formattedMessage = JSON.stringify(maskSensitiveData(rest));
  }
  if (stack) {
    formattedMessage += `\n${stack}`;
  }
  return `[${timestamp}] ${level}: ${formattedMessage}`;
});

const transports: winston.transport[] = [];

transports.push(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      generalLogFormat
    ),
  })
);

const logger = winston.createLogger({ 
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transports,
  exitOnError: false,
});

export default logger;
