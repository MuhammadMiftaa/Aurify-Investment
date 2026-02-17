import amqpConnectionManager from "amqp-connection-manager";
import logger from "../utils/logger.js";
import env from "../utils/env.js";
import {
  EVENT_DELAY_RETRY,
  EVENT_MAX_RETRIES,
  EXCHANGE_NAME,
  EXCHANGE_TYPE,
} from "./constant.js";

let connection = null;

export const getRabbitMQConnection = () => {
  if (connection) return connection;

  const url = `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}:${env.RABBITMQ_PORT}/${env.RABBITMQ_VIRTUAL_HOST}`;

  connection = amqpConnectionManager.connect([url], {
    reconnectTimeInSeconds: 5,
    heartbeatIntervalInSeconds: 60,
  });

  connection.on("connect", () => {
    logger.info("RabbitMQ connected");
  });

  connection.on("disconnect", ({ err }) => {
    logger.warn("RabbitMQ disconnected", { reason: err?.message });
  });

  connection.on("connectFailed", ({ err }) => {
    logger.error("RabbitMQ connection failed", { error: err?.message });
  });

  connection.createChannel({
    json: true,
    setup: async (channel) => {
      await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
        durable: true,
      });
      logger.info(`Exchange "${EXCHANGE_NAME}" declared`);
    },
  });

  return connection;
};

export const closeRabbitMQConnection = async () => {
  if (connection) {
    await connection.close();
    connection = null;
    logger.info("RabbitMQ connection closed");
  }
};

let channelWrapper = null;

const getChannel = () => {
  if (channelWrapper) return channelWrapper;

  const connection = getRabbitMQConnection();

  channelWrapper = connection.createChannel({
    json: true,
    setup: async (channel) => {
      await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
        durable: true,
      });
      logger.info(`Exchange "${EXCHANGE_NAME}" declared`);
    },
  });

  channelWrapper.on("connect", () => {
    logger.info("RabbitMQ channel ready");
  });

  channelWrapper.on("error", (err) => {
    logger.error("RabbitMQ channel error", { error: err.message });
  });

  return channelWrapper;
};

export const publish = async (routingKey, payload) => {
  const channel = getChannel();

  await channel.publish(EXCHANGE_NAME, routingKey, payload, {
    persistent: true,
    contentType: "application/json",
    timestamp: Date.now(),
  });

  logger.info(`Published event: ${routingKey}`, { payload });
};

export const publishWithRetry = async (
  routingKey,
  payload,
  retries = EVENT_MAX_RETRIES,
  delayMs = EVENT_DELAY_RETRY,
) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await publish(routingKey, payload);
      return;
    } catch (err) {
      logger.warn(`Publish attempt ${attempt}/${retries} failed`, {
        routingKey,
        error: err.message,
      });

      if (attempt === retries) {
        logger.error("All publish attempts failed", { routingKey, payload });
        return;
      }

      await new Promise((res) => setTimeout(res, delayMs * 2 ** (attempt - 1)));
    }
  }
};

export const closeChannel = async () => {
  if (channelWrapper) {
    await channelWrapper.close();
    channelWrapper = null;
    logger.info("RabbitMQ channel closed");
  }
};
