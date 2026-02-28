// ============================================================
// Single source of truth untuk semua nilai field logging.
// Tidak ada string literal log yang boleh ditulis di luar file ini.
// ============================================================

// ─── Service constants ───────────────────────────────────────
// Seluruh nilai field "service" HARUS didefinisikan di sini.
export const MainService = "main";
export const EnvService = "env";
export const DatabaseService = "database";
export const RabbitmqService = "rabbitmq";
export const GRPCServerService = "grpc_server";
export const HTTPServerService = "http_server";
export const CronService = "cron";
export const InvestmentService = "investment";
export const AssetService = "asset";

// ─── Message constants ───────────────────────────────────────
// Seluruh string pertama pada setiap log.*() call HARUS terdaftar di sini.
// Konvensi penamaan: prefix Log + PascalCase, pola {resource}_{operation}_{outcome}

// --- env / startup ---
export const LogEnvVarMissing = "env_var_missing";

// --- infrastructure setup ---
export const LogDBSetupSuccess = "db_setup_success";
export const LogDBCloseFailed = "db_close_failed";
export const LogRabbitmqConnected = "rabbitmq_connected";
export const LogRabbitmqDisconnected = "rabbitmq_disconnected";
export const LogRabbitmqConnectFailed = "rabbitmq_connect_failed";
export const LogRabbitmqChannelReady = "rabbitmq_channel_ready";
export const LogRabbitmqChannelError = "rabbitmq_channel_error";
export const LogRabbitmqExchangeDeclared = "rabbitmq_exchange_declared";
export const LogRabbitmqConnectionClosed = "rabbitmq_connection_closed";
export const LogRabbitmqChannelClosed = "rabbitmq_channel_closed";

// --- server lifecycle ---
export const LogHTTPServerStarted = "http_server_started";
export const LogHTTPServerClosed = "http_server_closed";
export const LogGRPCServerStarted = "grpc_server_started";
export const LogGRPCServerStartFailed = "grpc_server_start_failed";
export const LogGRPCServerClosed = "grpc_server_closed";
export const LogGRPCServerShutdownFailed = "grpc_server_shutdown_failed";
export const LogGRPCServiceRegistered = "grpc_service_registered";
export const LogShutdownStarted = "shutdown_started";
export const LogUncaughtException = "uncaught_exception";
export const LogUnhandledRejection = "unhandled_rejection";

// --- http middleware ---
export const LogAuthMissingHeader = "auth_missing_header";
export const LogAuthInvalidHeaderFormat = "auth_invalid_header_format";
export const LogAuthSuccess = "auth_success";
export const LogRouteNotFound = "route_not_found";
export const LogRequestCompleted = "request_completed";

// --- investment (handler) ---
export const LogInvestmentCreateFailed = "investment_create_failed";
export const LogInvestmentCreated = "investment_created";
export const LogInvestmentSellFailed = "investment_sell_failed";
export const LogInvestmentSellBadRequest = "investment_sell_bad_request";
export const LogInvestmentSold = "investment_sold";

// --- investment (service) ---
export const LogInvestmentEventPublishFailed =
  "investment_event_publish_failed";
export const LogInvestmentSoldEventPublishFailed =
  "investment_sold_event_publish_failed";

// --- asset (handler) ---
export const LogAssetRefreshFailed = "asset_refresh_failed";
export const LogAssetRefreshed = "asset_refreshed";

// --- rabbitmq publish ---
export const LogEventPublishAttemptFailed = "event_publish_attempt_failed";
export const LogEventPublishAllFailed = "event_publish_all_failed";
export const LogEventPublished = "event_published";

// --- gRPC handlers ---
export const LogGetInvestmentsFailed = "get_investments_failed";
export const LogGetInvestmentsCompleted = "get_investments_completed";
export const LogGetUserInvestmentsFailed = "get_user_investments_failed";
export const LogGetUserInvestmentsCompleted = "get_user_investments_completed";

// --- database ---
export const LogDBPoolConfigured = "db_pool_configured";
export const LogDBQueryError = "db_query_error";
export const LogDBQueryWarn = "db_query_warn";
export const LogDBQueryInfo = "db_query_info";
export const LogDBQueryExecuted = "db_query_executed";

// --- cron ---
export const LogCronAssetRefreshSuccess = "cron_asset_refresh_success";
export const LogCronAssetRefreshFailed = "cron_asset_refresh_failed";

// ─── Request ID constants ─────────────────────────────────────
export const REQUEST_ID_HEADER = "X-Request-ID";
export const REQUEST_ID_LOCAL_KEY = "request_id";
