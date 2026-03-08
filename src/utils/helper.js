import logger from "./logger.js";

export const validate = (schema, request) => {
  const result = schema.validate(request, {
    abortEarly: false,
    allowUnknown: false,
  });
  if (result.error) {
    logger.debug(result.error.message);
    throw new Error(400, result.error.message);
  } else {
    return result.value;
  }
};
