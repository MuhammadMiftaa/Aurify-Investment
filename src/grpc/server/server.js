import * as grpc from "@grpc/grpc-js";
import igrpcModule from "@muhammadmiftaa/refina-protobuf/investment/investment_grpc_pb.js";
import ipbModule from "@muhammadmiftaa/refina-protobuf/investment/investment_pb.js";
import service from "../../services/service.js";
import logger from "../../utils/logger.js";
import env from "../../utils/env.js";
import {
  GRPCServerService,
  LogGetInvestmentsCompleted,
  LogGetInvestmentsFailed,
  LogGetUserInvestmentsCompleted,
  LogGetUserInvestmentsFailed,
  LogGetUserInvestmentListCompleted,
  LogGetUserInvestmentListFailed,
  LogGetInvestmentDetailCompleted,
  LogGetInvestmentDetailFailed,
  LogCreateInvestmentCompleted,
  LogCreateInvestmentFailed,
  LogSellInvestmentCompleted,
  LogSellInvestmentFailed,
  LogGetInvestmentSummaryCompleted,
  LogGetInvestmentSummaryFailed,
  LogGetAssetCodesCompleted,
  LogGetAssetCodesFailed,
  LogGRPCServerClosed,
  LogGRPCServerShutdownFailed,
  LogGRPCServerStartFailed,
  LogGRPCServerStarted,
  LogGRPCServiceRegistered,
} from "../../utils/log.js";
import {
  unaryServerInterceptor,
  serverStreamInterceptor,
  logFieldsFromCall,
  CTX_USER_ID,
  CTX_REQUEST_ID,
} from "../interceptor/userMetadata.js";

const igrpc = igrpcModule.InvestmentServiceService || igrpcModule;
const ipb = ipbModule.proto?.investment || ipbModule;

class InvestmentServiceImpl {
  _investmentToProto(investment) {
    const investmentProto = new ipb.Investment();
    const assetCodeProto = new ipb.AssetCode();

    investmentProto.setId(investment.id);
    investmentProto.setCode(investment.code);
    investmentProto.setUserId(investment.userId);
    investmentProto.setQuantity(investment.quantity);
    investmentProto.setInitialValuation(investment.initialValuation);
    investmentProto.setAmount(investment.amount);
    investmentProto.setDate(
      investment.date instanceof Date
        ? investment.date.toISOString()
        : String(investment.date || ""),
    );
    investmentProto.setDescription(investment.description || "");
    investmentProto.setCreatedAt(
      investment.createdAt instanceof Date
        ? investment.createdAt.toISOString()
        : String(investment.createdAt || ""),
    );
    investmentProto.setUpdatedAt(
      investment.updatedAt instanceof Date
        ? investment.updatedAt.toISOString()
        : String(investment.updatedAt || ""),
    );
    investmentProto.setWalletId(investment.walletId || "");

    assetCodeProto.setCode(investment.assetCode.code);
    assetCodeProto.setName(investment.assetCode.name);
    assetCodeProto.setUnit(investment.assetCode.unit);
    assetCodeProto.setTousd(investment.assetCode.toUSD);
    assetCodeProto.setToidr(investment.assetCode.toIDR);
    assetCodeProto.setToeur(investment.assetCode.toEUR);
    assetCodeProto.setCreatedAt(
      investment.assetCode.createdAt instanceof Date
        ? investment.assetCode.createdAt.toISOString()
        : String(investment.assetCode.createdAt || ""),
    );
    assetCodeProto.setUpdatedAt(
      investment.assetCode.updatedAt instanceof Date
        ? investment.assetCode.updatedAt.toISOString()
        : String(investment.assetCode.updatedAt || ""),
    );

    investmentProto.setAsset(assetCodeProto);

    return investmentProto;
  }

  _assetCodeToProto(asset) {
    const proto = new ipb.AssetCode();
    proto.setCode(asset.code);
    proto.setName(asset.name);
    proto.setUnit(asset.unit || "");
    proto.setTousd(asset.toUSD || 0);
    proto.setToidr(asset.toIDR || 0);
    proto.setToeur(asset.toEUR || 0);
    proto.setCreatedAt(
      asset.createdAt instanceof Date
        ? asset.createdAt.toISOString()
        : String(asset.createdAt || ""),
    );
    proto.setUpdatedAt(
      asset.updatedAt instanceof Date
        ? asset.updatedAt.toISOString()
        : String(asset.updatedAt || ""),
    );
    return proto;
  }

  _soldToProto(sold) {
    const proto = new ipb.InvestmentSold();
    proto.setId(sold.id);
    proto.setInvestmentId(sold.investmentId);
    proto.setUserId(sold.userId);
    proto.setQuantity(sold.quantity);
    proto.setSellPrice(sold.sellPrice);
    proto.setAmount(sold.amount);
    proto.setDate(
      sold.date instanceof Date
        ? sold.date.toISOString()
        : String(sold.date || ""),
    );
    proto.setDescription(sold.description || "");
    proto.setDeficit(sold.deficit || 0);
    proto.setCreatedAt(
      sold.createdAt instanceof Date
        ? sold.createdAt.toISOString()
        : String(sold.createdAt || ""),
    );
    proto.setUpdatedAt(
      sold.updatedAt instanceof Date
        ? sold.updatedAt.toISOString()
        : String(sold.updatedAt || ""),
    );
    proto.setWalletId(sold.walletId || "");
    if (sold.assetCode) {
      proto.setAsset(this._assetCodeToProto(sold.assetCode));
    }
    return proto;
  }

  async getInvestments(call) {
    const lf = logFieldsFromCall(call);
    try {
      const limit = call.request.getLimit() || 10;
      const investments = await service.investmentList(limit);

      for (const investment of investments) {
        call.write(this._investmentToProto(investment));
      }

      call.end();
      logger.info(LogGetInvestmentsCompleted, {
        ...lf,
        count: investments.length,
      });
    } catch (error) {
      logger.error(LogGetInvestmentsFailed, {
        ...lf,
        error: error.message,
      });
      call.destroy(
        new grpc.StatusBuilder()
          .withCode(grpc.status.INTERNAL)
          .withDetails(error.message)
          .build(),
      );
    }
  }

  async getUserInvestments(call) {
    const lf = logFieldsFromCall(call);
    try {
      const userId = call.request.getId();

      if (!userId) {
        throw new Error("user id is required");
      }

      const investments = await service.userInvestmentList(userId);

      for (const investment of investments) {
        call.write(this._investmentToProto(investment));
      }

      call.end();
      logger.info(LogGetUserInvestmentsCompleted, {
        ...lf,
        user_id: userId,
        count: investments.length,
      });
    } catch (error) {
      logger.error(LogGetUserInvestmentsFailed, {
        ...lf,
        error: error.message,
      });
      call.destroy(
        new grpc.StatusBuilder()
          .withCode(grpc.status.INTERNAL)
          .withDetails(error.message)
          .build(),
      );
    }
  }

  async getUserInvestmentList(call, callback) {
    const lf = logFieldsFromCall(call);
    try {
      const userId = call.request.getUserId();
      const page = call.request.getPage() || 1;
      const pageSize = call.request.getPageSize() || 10;
      const sortBy = call.request.getSortBy() || "date";
      const sortOrder = call.request.getSortOrder() || "desc";
      const search = call.request.getSearch() || "";
      const code = call.request.getCode() || "";

      if (!userId) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "user id is required",
        });
      }

      let investments = await service.userInvestmentList(userId);

      // Filter by asset code
      if (code) {
        investments = investments.filter((inv) => inv.code === code);
      }

      // Search filter
      if (search) {
        const s = search.toLowerCase();
        investments = investments.filter(
          (inv) =>
            (inv.description || "").toLowerCase().includes(s) ||
            inv.code.toLowerCase().includes(s) ||
            (inv.assetCode?.name || "").toLowerCase().includes(s),
        );
      }

      const total = investments.length;

      // Sort
      investments.sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "amount":
            cmp = Number(a.amount) - Number(b.amount);
            break;
          case "quantity":
            cmp = Number(a.quantity) - Number(b.quantity);
            break;
          case "date":
          default:
            cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
        }
        return sortOrder === "desc" ? -cmp : cmp;
      });

      // Paginate
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const paged = investments.slice(start, start + pageSize);

      const resp = new ipb.GetUserInvestmentListResponse();
      resp.setInvestmentsList(paged.map((inv) => this._investmentToProto(inv)));
      resp.setTotal(total);
      resp.setPage(page);
      resp.setPageSize(pageSize);
      resp.setTotalPages(totalPages);

      logger.info(LogGetUserInvestmentListCompleted, {
        ...lf,
        user_id: userId,
        total,
        page,
      });

      callback(null, resp);
    } catch (error) {
      logger.error(LogGetUserInvestmentListFailed, {
        ...lf,
        error: error.message,
      });
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  }

  async getInvestmentDetail(call, callback) {
    const lf = logFieldsFromCall(call);
    try {
      const userId = call.request.getUserId();
      const investmentId = call.request.getInvestmentId();

      if (!userId || !investmentId) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "user id and investment id are required",
        });
      }

      const investment = await service.investmentDetail(userId, investmentId);

      if (!investment) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: "Investment not found",
        });
      }

      logger.info(LogGetInvestmentDetailCompleted, {
        ...lf,
        user_id: userId,
        investment_id: investmentId,
      });

      callback(null, this._investmentToProto(investment));
    } catch (error) {
      logger.error(LogGetInvestmentDetailFailed, {
        ...lf,
        error: error.message,
      });
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  }

  async createInvestment(call, callback) {
    const lf = logFieldsFromCall(call);
    try {
      const userId = call.request.getUserId();

      if (!userId) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "user id is required",
        });
      }

      const request = {
        code: call.request.getCode(),
        quantity: call.request.getQuantity(),
        amount: call.request.getAmount(),
        initialValuation: call.request.getInitialValuation(),
        date: call.request.getDate(),
        description: call.request.getDescription(),
        walletId: call.request.getWalletId(),
      };

      const created = await service.investmentCreate(userId, request);

      logger.info(LogCreateInvestmentCompleted, {
        ...lf,
        user_id: userId,
        investment_id: created.id,
      });

      callback(null, this._investmentToProto(created));
    } catch (error) {
      logger.error(LogCreateInvestmentFailed, {
        ...lf,
        error: error.message,
      });

      const code =
        error.name === "ValidationError"
          ? grpc.status.INVALID_ARGUMENT
          : grpc.status.INTERNAL;

      callback({ code, message: error.message });
    }
  }

  async sellInvestment(call, callback) {
    const lf = logFieldsFromCall(call);
    try {
      const userId = call.request.getUserId();

      if (!userId) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "user id is required",
        });
      }

      const request = {
        assetcode: call.request.getAssetCode(),
        quantity: call.request.getQuantity(),
        amount: call.request.getAmount(),
        date: call.request.getDate(),
        description: call.request.getDescription(),
        walletId: call.request.getWalletId(),
      };

      const soldRecords = await service.investmentSell(userId, request);

      const resp = new ipb.SellInvestmentResponse();
      resp.setSoldRecordsList(soldRecords.map((s) => this._soldToProto(s)));

      logger.info(LogSellInvestmentCompleted, {
        ...lf,
        user_id: userId,
        sold_count: soldRecords.length,
      });

      callback(null, resp);
    } catch (error) {
      logger.error(LogSellInvestmentFailed, {
        ...lf,
        error: error.message,
      });

      let code = grpc.status.INTERNAL;
      if (error.name === "ValidationError") code = grpc.status.INVALID_ARGUMENT;
      if (error.name === "NotFoundError") code = grpc.status.NOT_FOUND;

      callback({ code, message: error.message });
    }
  }

  async getInvestmentSummary(call, callback) {
    const lf = logFieldsFromCall(call);
    try {
      const userId = call.request.getId();

      if (!userId) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "user id is required",
        });
      }

      const investments = await service.userInvestmentList(userId);

      let totalInvested = 0;
      let totalCurrentValue = 0;

      for (const inv of investments) {
        totalInvested += Number(inv.amount);
        // Current value = quantity * current price (toIDR from assetCode)
        const currentPrice = Number(inv.assetCode?.toIDR || 0);
        totalCurrentValue += Number(inv.quantity) * currentPrice;
      }

      const totalProfitLoss = totalCurrentValue - totalInvested;
      const totalProfitLossPct =
        totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

      // Get sold records summary (simplified – count from DB if needed)
      // For now, we calculate from the investment list

      const resp = new ipb.InvestmentSummaryResponse();
      resp.setTotalInvestments(investments.length);
      resp.setTotalInvested(totalInvested);
      resp.setTotalCurrentValue(totalCurrentValue);
      resp.setTotalProfitLoss(totalProfitLoss);
      resp.setTotalProfitLossPct(totalProfitLossPct);
      resp.setTotalSoldAmount(0); // TODO: aggregate from sold records
      resp.setTotalRealizedGain(0); // TODO: aggregate from sold records

      logger.info(LogGetInvestmentSummaryCompleted, {
        ...lf,
        user_id: userId,
        total_investments: investments.length,
      });

      callback(null, resp);
    } catch (error) {
      logger.error(LogGetInvestmentSummaryFailed, {
        ...lf,
        error: error.message,
      });
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  }

  async getAssetCodes(call, callback) {
    const lf = logFieldsFromCall(call);
    try {
      const assets = await service.assetList();

      const resp = new ipb.GetAssetCodesResponse();
      resp.setAssetCodesList(assets.map((a) => this._assetCodeToProto(a)));

      logger.info(LogGetAssetCodesCompleted, {
        ...lf,
        count: assets.length,
      });

      callback(null, resp);
    } catch (error) {
      logger.error(LogGetAssetCodesFailed, {
        ...lf,
        error: error.message,
      });
      callback({
        code: grpc.status.INTERNAL,
        message: error.message,
      });
    }
  }
}

export class GRPCServer {
  constructor() {
    this.server = new grpc.Server();

    const impl = new InvestmentServiceImpl();

    // Wrap each handler with the appropriate interceptor.
    // Server-streaming RPCs use serverStreamInterceptor (no callback).
    // Unary RPCs use unaryServerInterceptor (call, callback).
    const wrappedService = {
      getInvestments: serverStreamInterceptor(impl.getInvestments.bind(impl)),
      getUserInvestments: serverStreamInterceptor(
        impl.getUserInvestments.bind(impl),
      ),
      getUserInvestmentList: unaryServerInterceptor(
        impl.getUserInvestmentList.bind(impl),
      ),
      getInvestmentDetail: unaryServerInterceptor(
        impl.getInvestmentDetail.bind(impl),
      ),
      createInvestment: unaryServerInterceptor(
        impl.createInvestment.bind(impl),
      ),
      sellInvestment: unaryServerInterceptor(impl.sellInvestment.bind(impl)),
      getInvestmentSummary: unaryServerInterceptor(
        impl.getInvestmentSummary.bind(impl),
      ),
      getAssetCodes: unaryServerInterceptor(impl.getAssetCodes.bind(impl)),
    };

    this.server.addService(igrpc, wrappedService);

    logger.info(LogGRPCServiceRegistered, {
      service: GRPCServerService,
      grpc_service: "InvestmentService",
    });
  }

  start() {
    const port = env.GRPC_PORT || 50051;

    this.server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          logger.error(LogGRPCServerStartFailed, {
            service: GRPCServerService,
            error: error.message,
          });
          throw error;
        }
        logger.info(LogGRPCServerStarted, {
          service: GRPCServerService,
          port: boundPort,
        });
      },
    );
  }

  stop() {
    return new Promise((resolve) => {
      this.server.tryShutdown((error) => {
        if (error) {
          logger.error(LogGRPCServerShutdownFailed, {
            service: GRPCServerService,
            error: error.message,
          });
          this.server.forceShutdown();
        } else {
          logger.info(LogGRPCServerClosed, { service: GRPCServerService });
        }
        resolve();
      });
    });
  }
}
