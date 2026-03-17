import { getRabbitMQConnection } from "../utils/queue.js";
import {
  ADMIN_EXCHANGE,
  ADMIN_QUEUE,
  ADMIN_ROUTING_KEY,
  EXCHANGE_TYPE,
} from "../utils/constant.js";
import logger from "../utils/logger.js";
import {
  AdminConsumerService,
  LogAdminConsumerStarted,
  LogAdminConsumerFailed,
  LogAdminEventHandleFailed,
  LogAdminEventUnknown,
  LogAdminAssetCodeCreated,
  LogAdminAssetCodeUpdated,
  LogAdminAssetCodeDeleted,
} from "../utils/log.js";
import service from "../services/service.js";

let channelWrapper = null;

export const startAdminConsumer = () => {
  const connection = getRabbitMQConnection();

  channelWrapper = connection.createChannel({
    json: true,
    setup: async (channel) => {
      await channel.assertExchange(ADMIN_EXCHANGE, EXCHANGE_TYPE, {
        durable: true,
      });
      await channel.assertQueue(ADMIN_QUEUE, { durable: true });
      await channel.bindQueue(ADMIN_QUEUE, ADMIN_EXCHANGE, ADMIN_ROUTING_KEY);
      await channel.prefetch(1);

      channel.consume(ADMIN_QUEUE, async (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString());
          const { action, data } = event;

          switch (action) {
            case "create": {
              await service.assetCodeCreate(data);
              logger.info(LogAdminAssetCodeCreated, {
                service: AdminConsumerService,
                code: data.code,
              });
              break;
            }
            case "update": {
              await service.assetCodeUpdate(data.code, data);
              logger.info(LogAdminAssetCodeUpdated, {
                service: AdminConsumerService,
                code: data.code,
              });
              break;
            }
            case "delete": {
              await service.assetCodeDelete(data.code);
              logger.info(LogAdminAssetCodeDeleted, {
                service: AdminConsumerService,
                code: data.code,
              });
              break;
            }
            default:
              logger.warn(LogAdminEventUnknown, {
                service: AdminConsumerService,
                action,
              });
          }

          channel.ack(msg);
        } catch (error) {
          logger.error(LogAdminEventHandleFailed, {
            service: AdminConsumerService,
            error: error.message,
          });
          // Negative acknowledge – requeue for retry
          channel.nack(msg, false, true);
        }
      });

      logger.info(LogAdminConsumerStarted, {
        service: AdminConsumerService,
        queue: ADMIN_QUEUE,
        exchange: ADMIN_EXCHANGE,
        routing_key: ADMIN_ROUTING_KEY,
      });
    },
  });

  channelWrapper.on("error", (err) => {
    logger.error(LogAdminConsumerFailed, {
      service: AdminConsumerService,
      error: err.message,
    });
  });
};

export const stopAdminConsumer = async () => {
  if (channelWrapper) {
    await channelWrapper.close();
    channelWrapper = null;
  }
};
