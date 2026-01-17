import Joi from "joi";

const investmentValidation = Joi.object({
  code: Joi.string().required(),
  quantity: Joi.number().min(0).required(),
  initialValuation: Joi.number().min(0).required(),
  date: Joi.date().required(),
  description: Joi.string().max(500).optional(),
});

export { investmentValidation };
