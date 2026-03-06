import Joi from "joi";

const newInvestmentValidation = Joi.object({
  code: Joi.string().required(),
  quantity: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
  date: Joi.date().required(),
  description: Joi.string().max(500).optional(),
  initialValuation: Joi.number().min(0).optional(),
  walletId: Joi.string().required(),
});

const sellInvestmentValidation = Joi.object({
  assetcode: Joi.string().required(),
  quantity: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
  date: Joi.date().required(),
  description: Joi.string().max(500).optional(),
  walletId: Joi.string().required(),
});

export { newInvestmentValidation, sellInvestmentValidation };
