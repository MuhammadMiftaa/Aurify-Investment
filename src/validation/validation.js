import Joi from "joi";

const newInvestmentValidation = Joi.object({
  code: Joi.string().required(),
  quantity: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
  date: Joi.date().required(),
  description: Joi.string().max(500).optional(),
});

const sellInvestmentValidation = Joi.object({
  assetcode: Joi.string().required(),
  quantity: Joi.number().min(0).required(),
  amount: Joi.number().min(0).required(),
  date: Joi.date().required(),
  description: Joi.string().max(500).optional(),
});

export { newInvestmentValidation, sellInvestmentValidation };
