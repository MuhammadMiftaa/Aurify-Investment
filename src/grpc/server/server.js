import * as grpc from "@grpc/grpc-js";
import igrpcModule from "@muhammadmiftaa/refina-protobuf/investment/investment_grpc_pb.js";
import ipbModule from "@muhammadmiftaa/refina-protobuf/investment/investment_pb.js";
import service from "../../services/service.js";
import logger from "../../utils/logger.js";
import env from "../../utils/env.js";

const igrpc = igrpcModule.InvestmentServiceService || igrpcModule;
const ipb = ipbModule.proto?.investment || ipbModule;

class InvestmentServiceImpl {
  _investmentToProto(investment) {
    const investmentProto = new ipb.Investment();
    const assetCodeProto = new ipb.AssetCode();

investmentProto.setId(investment.id);
    investmentProto.setCode(investment.code);
    investmentProto.setUserid(investment.userId);
    investmentProto.setQuantity(investment.quantity);
    investmentProto.setInitialvaluation(investment.initialValuation);
    investmentProto.setAmount(investment.amount);
    investmentProto.setDate(investment.date);
    investmentProto.setDescription(investment.description);
    investmentProto.setCreatedat(investment.createdAt);
    investmentProto.setUpdatedat(investment.updatedAt);

    assetCodeProto.setCode(investment.assetCode.code);
    assetCodeProto.setName(investment.assetCode.name);
    assetCodeProto.setUnit(investment.assetCode.unit);
    assetCodeProto.setTousd(investment.assetCode.toUSD);
    assetCodeProto.setToidr(investment.assetCode.toIDR);
    assetCodeProto.setToeur(investment.assetCode.toEUR);
    assetCodeProto.setCreatedat(investment.assetCode.createdAt);
    assetCodeProto.setUpdatedat(investment.assetCode.updatedAt);

    investmentProto.setAssetcode(assetCodeProto);

    return investmentProto;
  }

  async getInvestments(call) {
    try {
      const limit = call.request.getLimit() || 10;
      const investments = await service.investmentList(limit);

      for (const investment of investments) {
        call.write(this._investmentToProto(investment));
      }

      call.end();
      logger.info(`GetInvestments completed, sent ${investments.length} items`);
    } catch (error) {
      logger.error("Error in GetInvestments:", error);
      call.destroy(
        new grpc.StatusBuilder()
          .withCode(grpc.status.INTERNAL)
          .withDetails(error.message)
          .build()
      );
    }
  }

  async getUserInvestments(call) {
    try {
      const userId = call.request.getId();
      
      if (!userId) {
        throw new Error("User ID is required");
      }

      const investments = await service.userInvestmentList(userId);

      for (const investment of investments) {
        call.write(this._investmentToProto(investment));
      }

      call.end();
      logger.info(`GetUserInvestment completed, sent ${investments.length} items`);
    } catch (error) {
      logger.error("Error in GetUserInvestment:", error);
      call.destroy(
        new grpc.StatusBuilder()
          .withCode(grpc.status.INTERNAL)
          .withDetails(error.message)
          .build()
      );
    }
  }
}

export class GRPCServer {
  constructor() {
    this.server = new grpc.Server();
    
    this.server.addService(
      igrpc,
      new InvestmentServiceImpl()
    );
    
    logger.info("InvestmentService registered to gRPC server");
  }

  start() {
    const port = env.GRPC_PORT || 50051;
    
    this.server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          logger.error("Error starting gRPC server:", error);
          throw error;
        }
      }
    );
  }

  stop() {
    return new Promise((resolve) => {
      this.server.tryShutdown((error) => {
        if (error) {
          logger.error("Error shutting down gRPC server:", error);
          this.server.forceShutdown();
        } else {
          logger.info("gRPC server shut down gracefully");
        }
        resolve();
      });
    });
  }
}