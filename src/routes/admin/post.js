import { StatusCodes } from "http-status-codes";
import { ValidationError } from "joi";
import {
  comparePassword,
  encryptData,
  getCurrentUnix,
  hashPassword,
} from "../../commons/common-functions";
import { getJwt } from "../../helpers/Jwt.helper";
import { CustomError } from "../../helpers/custome.error";
import {
  createAdminValidation,
  loginAdminValidation,
} from "../../helpers/validations/admin.user.validation";
import { responseGenerators } from "../../lib/utils";
import AdminModel from "../../models/admin";

// Create Admin
export const createAdminHandler = async (req, res) => {
  try {
    await createAdminValidation.validateAsync(req.body);

    const isAvailable = await AdminModel.findOne({
      isDeleted: false,
      email: req.body.email.toLowerCase(),
    });
    if (isAvailable)
      throw new CustomError(`Member with given details already exists`);

    let hashPass = await hashPassword(req.body.password);
    req.body.password = hashPass;

    const adminData = await AdminModel.create({
      ...req.body,
      email: req.body.email.toLowerCase(),
      createdAt: getCurrentUnix(),
      createdBy: "",
    });
    return res
      .status(StatusCodes.OK)
      .send(
        responseGenerators(
          { ...adminData.toJSON() },
          StatusCodes.OK,
          "SUCCESS",
          0
        )
      );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    console.log(JSON.stringify(error));
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};

// updated Admin
export const updateAdminHandler = async (req, res) => {
  try {
    // await updateAdminValidation.validateAsync({ ...req.body, ...req.params });
    let isAvailable = await AdminModel.findOne({
      $and: [
        { isDeleted: false },
        { id: { $ne: req.params.id } },
        { email: req.body.email.toLowerCase() },
      ],
    });
    if (req.body.phone && !isAvailable) {
      isAvailable = await AdminModel.findOne({
        $and: [
          { isDeleted: false },
          { id: { $ne: req.params.id } },
          { phone: req.body.phone },
        ],
      });
    }
    if (isAvailable)
      throw new CustomError(
        `Admin is Already Exist with Email or Admin Name or Mobile Number`
      );

    let updatedData = await AdminModel.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, email: req.body.email.toLowerCase() },
      { new: true }
    );

    if (!updatedData) throw new CustomError(`Admin does not exist`);

    return res
      .status(StatusCodes.OK)
      .send(
        responseGenerators(
          { ...updatedData.toJSON() },
          StatusCodes.OK,
          "SUCCESS",
          0
        )
      );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};

// delete AdminModel
export const deleteAdminHandler = async (req, res) => {
  try {
    if (!req.params.id) throw new CustomError(`Please provide vaild id`);

    const isAvailable = await AdminModel.findOne({
      isDeleted: false,
      id: req.params.id,
    });

    if (!isAvailable) throw new CustomError(`Admin dosnt't exists`);

    isAvailable.isDeleted = true;
    await isAvailable.save();

    return res
      .status(StatusCodes.OK)
      .send(responseGenerators({}, StatusCodes.OK, "SUCCESS", 0));
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    console.log(JSON.stringify(error));
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};

// login AdminModel
export const loginAdminHandler = async (req, res) => {
  try {
    await loginAdminValidation.validateAsync(req.body);
    let loginData = await AdminModel.findOne({
      email: req.body.email.toLowerCase(),
      isDeleted: false,
    });

    if (!loginData) throw new CustomError(`Invalid email or password.`);

    let isPasswordMatched = await comparePassword(
      req.body.password,
      loginData.password
    );
    if (!isPasswordMatched) throw new CustomError(`Invalid email or password.`);
    let loginDataRaw = loginData.toJSON();
    loginData.lastLogin = getCurrentUnix();
    loginData.save();
    delete loginDataRaw.password;
    let jswToken = await getJwt({ id: loginDataRaw._id, superAdmin: true });

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          token: encryptData(jswToken),
          userData: loginData,
          loginCompleted: true,
        },
        StatusCodes.OK,
        "SUCCESS",
        0
      )
    );
  } catch (error) {
    if (error instanceof ValidationError || error instanceof CustomError) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators({}, StatusCodes.BAD_REQUEST, error.message, 1)
        );
    }
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send(
        responseGenerators(
          {},
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Internal Server Error",
          1
        )
      );
  }
};
