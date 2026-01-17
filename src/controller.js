import service from "./service.js";

const investmentList = async (req, res, next) => {
  try {
    const user = req.user;

    const result = await service.investmentList(user.id);

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Success retrieving investments",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const investmentCreate = async (req, res, next) => {
  try {
    const user = req.user;
    const result = await service.investmentCreate(user.id, req.body);

    res.status(201).json({
      status: true,
      statusCode: 201,
      message: "Success creating investment",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const assetList = async (req, res, next) => {
  try {
    const result = await service.assetList();

    res.status(200).json({
      status: true,
      statusCode: 200,
      message: "Success retrieving asset codes",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  investmentList,
  investmentCreate,
  assetList,
};
