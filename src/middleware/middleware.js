import { randomUUID } from "crypto";
import { ERROR_MESSAGES } from "../utils/constant.js";
import { extractAndVerifyJwtClaims } from "../utils/helper.js";
import logger from "../utils/logger.js";
import {
  HTTPServerService,
  LogAuthInvalidHeaderFormat,
  LogAuthMissingHeader,
  LogAuthSuccess,
  LogRequestCompleted,
  LogRouteNotFound,
  LogUnexpectedError,
  REQUEST_ID_HEADER,
  REQUEST_ID_LOCAL_KEY,
} from "../utils/log.js";

//$ Generates / propagates a unique request ID per HTTP request.
//  MUST be mounted BEFORE requestLogger so request_id is available when log is written.
export function requestIDMiddleware(req, res, next) {
  let requestID = req.headers[REQUEST_ID_HEADER.toLowerCase()];
  if (!requestID) {
    requestID = randomUUID();
  }
  req[REQUEST_ID_LOCAL_KEY] = requestID;
  res.setHeader(REQUEST_ID_HEADER, requestID);
  next();
}

//$ Extracts user info from token and attaches to req.user
export function authenticate(req, res, next) {
  try {
    const requestID = req[REQUEST_ID_LOCAL_KEY];
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn(LogAuthMissingHeader, {
        service: HTTPServerService,
        request_id: requestID,
      });
      const err = new Error(ERROR_MESSAGES.TOKEN_REQUIRED);
      err.statusCode = 401;
      err.isOperational = true;
      return next(err);
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn(LogAuthInvalidHeaderFormat, {
        service: HTTPServerService,
        request_id: requestID,
      });
      const err = new Error(ERROR_MESSAGES.TOKEN_INVALID);
      err.statusCode = 401;
      err.isOperational = true;
      return next(err);
    }

    const token = parts[1];
    const decoded = extractAndVerifyJwtClaims(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    };

    logger.debug(LogAuthSuccess, {
      service: HTTPServerService,
      request_id: requestID,
      user_id: req.user.id,
    });

    next();
  } catch (error) {
    next(error);
  }
}

//$ HTTP access log — logs every request lifecycle with structured fields.
//  Level: 2xx/3xx → info, 4xx → warn, 5xx → error
export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const latencyMs = Date.now() - start;
    const status = res.statusCode;

    const fields = {
      service: HTTPServerService,
      request_id: req[REQUEST_ID_LOCAL_KEY],
      method: req.method,
      uri: req.originalUrl,
      status,
      latency: `${latencyMs}ms`,
      client_ip: req.ip,
      user_agent: req.headers["user-agent"] || "",
      request_size: req.headers["content-length"]
        ? parseInt(req.headers["content-length"], 10)
        : 0,
      response_size: parseInt(res.getHeader("content-length") || "0", 10),
      protocol: req.protocol,
    };

    if (req.user?.id) {
      fields.user_id = req.user.id;
    }

    if (status >= 500) {
      logger.error(LogRequestCompleted, fields);
    } else if (status >= 400) {
      logger.warn(LogRequestCompleted, fields);
    } else {
      logger.info(LogRequestCompleted, fields);
    }
  });

  next();
}

//$ Handles all errors and sends appropriate response
export function errorHandler(err, req, res, next) {
  const requestID = req[REQUEST_ID_LOCAL_KEY];
  const status = err.statusCode || 500;

  if (!err.isOperational) {
    logger.error(LogUnexpectedError, {
      service: HTTPServerService,
      request_id: requestID,
      path: req.path,
      method: req.method,
      error: err.message,
    });
  }

  res.status(status).json({
    statusCode: status,
    message: err.isOperational
      ? err.message
      : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  });
}

//$ 404 Not Found handler
export function notFoundHandler(req, res, next) {
  logger.warn(LogRouteNotFound, {
    service: HTTPServerService,
    request_id: req[REQUEST_ID_LOCAL_KEY],
    method: req.method,
    path: req.path,
  });
  res.status(404).json({
    statusCode: 404,
    message: "Route not found",
  });
}
