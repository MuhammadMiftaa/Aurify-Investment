import amqpConnectionManager from "amqp-connection-manager";
import logger from "../utils/logger.js";
import env from "../utils/env.js";
import {
  EVENT_DELAY_RETRY,
  EVENT_MAX_RETRIES,
  EXCHANGE_NAME,
  EXCHANGE_TYPE,
} from "./constant.js";
import {
  LogEventPublishAllFailed,
  LogEventPublishAttemptFailed,
  LogEventPublished,
  LogRabbitmqChannelClosed,
  LogRabbitmqChannelError,
  LogRabbitmqChannelReady,
  LogRabbitmqConnectFailed,
  LogRabbitmqConnected,
  LogRabbitmqConnectionClosed,
  LogRabbitmqDisconnected,
  LogRabbitmqExchangeDeclared,
  RabbitmqService,
} from "./log.js";

let connection = null;

export const getRabbitMQConnection = () => {
  if (connection) return connection;

  const url = `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASSWORD}@${env.RABBITMQ_HOST}:${env.RABBITMQ_PORT}/${env.RABBITMQ_VIRTUAL_HOST}`;

  connection = amqpConnectionManager.connect([url], {
    reconnectTimeInSeconds: 5,
    heartbeatIntervalInSeconds: 60,
  });

  connection.on("connect", () => {
    logger.info(LogRabbitmqConnected, { service: RabbitmqService });
  });

  connection.on("disconnect", ({ err }) => {
    logger.warn(LogRabbitmqDisconnected, {
      service: RabbitmqService,
      error: err?.message,
    });
  });

  connection.on("connectFailed", ({ err }) => {
    logger.error(LogRabbitmqConnectFailed, {
      service: RabbitmqService,
      error: err?.message,
    });
  });

  connection.createChannel({
    json: true,
    setup: async (channel) => {
      await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
        durable: true,
      });
      logger.info(LogRabbitmqExchangeDeclared, {
        service: RabbitmqService,
        exchange: EXCHANGE_NAME,
      });
    },
  });

  return connection;
};

export const closeRabbitMQConnection = async () => {
  if (connection) {
    await connection.close();
    connection = null;
    logger.info(LogRabbitmqConnectionClosed, { service: RabbitmqService });
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
      logger.info(LogRabbitmqExchangeDeclared, {
        service: RabbitmqService,
        exchange: EXCHANGE_NAME,
      });
    },
  });

  channelWrapper.on("connect", () => {
    logger.info(LogRabbitmqChannelReady, { service: RabbitmqService });
  });

  channelWrapper.on("error", (err) => {
    logger.error(LogRabbitmqChannelError, {
      service: RabbitmqService,
      error: err.message,
    });
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

  logger.info(LogEventPublished, {
    service: RabbitmqService,
    routing_key: routingKey,
  });
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
      logger.warn(LogEventPublishAttemptFailed, {
        service: RabbitmqService,
        routing_key: routingKey,
        attempt,
        retries,
        error: err.message,
      });

      if (attempt === retries) {
        logger.error(LogEventPublishAllFailed, {
          service: RabbitmqService,
          routing_key: routingKey,
          error: err.message,
        });
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
    logger.info(LogRabbitmqChannelClosed, { service: RabbitmqService });
  }
};
