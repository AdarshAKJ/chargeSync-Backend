import { ValidationError } from "joi";
import {
  createCustomerValidation,
  forgotPasswordValidation,
  getCustomerSelectValidation,
  listCustomerValidation,
  resetPasswordValidation,
  loginValidation,
  signupOrLoginOTPVerificationValidation,
  singleCustomerValidation,
  updateCustomerValidation,
  v2CreateCustomerValidation,
} from "../../helpers/validations/customer.validation";
import { responseGenerators } from "../../lib/utils";
import WalletModel from "../../models/wallet";
import { StatusCodes } from "http-status-codes";
import { CustomError } from "../../helpers/custome.error";
import {
  comparePassword,
  encryptData,
  generateSecret,
  generateTOTP,
  getCurrentUnix,
  hashPassword,
  setPagination,
  verifyTotp,
} from "../../commons/common-functions";
import { getJwt } from "../../helpers/Jwt.helper";
import { CUSTOMER_MESSAGE, OTP } from "../../commons/global-constants";
import CustomerModel from "../../models/customer";
import { hashSync } from "bcryptjs";
import TransactionModel from "../../models/transaction";

/** v2 version of create customer. We are using this Route */
export const v2CreateCustomerHandler = async (req, res) => {
  try {
    // validation
    await v2CreateCustomerValidation.validateAsync(req.body);

    if (req.body.loginBy == "EMAIL") {
      let customerData;

      customerData = await CustomerModel.findOne({
        email: req.body.email.toLowerCase(),
        isDeleted: false,
      });

      // check customer is not exist
      if (!customerData || (customerData && !customerData.isVerified)) {
        if (customerData && !customerData.isVerified) {
          await CustomerModel.deleteOne({
            _id: customerData._id,
          });
        }

        //create customer
        customerData = await CustomerModel.create({
          ...req.body,
          email: req.body.email.toLowerCase(),
          created_at: getCurrentUnix(),
          updated_at: getCurrentUnix(),
        });

        // generate otp
        const secret = generateSecret();
        const purpose = "SIGNUP-LOGIN";
        const { code, newOtpSecret } = generateTOTP(secret, purpose);
        customerData.otpSecret.push(newOtpSecret);
        await customerData.save();
        console.log(
          `SIGNUP OR LOGIN EMAIL:- ` + req.body.email + ` OTP :- ` + code
        );

        //send otp  TO DO
        return res.status(StatusCodes.OK).send(
          responseGenerators(
            {
              isNew: true,
              id: customerData._id,
              test: code, // Temporary
            },
            StatusCodes.OK,
            OTP.SUCCESS,
            0
          )
        );
      } else {
        return res.status(StatusCodes.OK).send(
          responseGenerators(
            {
              isNew: false,
              id: customerData._id,
            },
            StatusCodes.OK,
            CUSTOMER_MESSAGE.LOGIN_SUCCESS,
            0
          )
        );
      }
    } else if (req.body.loginBy == "PHONE") {
      let customerData;

      customerData = await CustomerModel.findOne({
        phoneNumber: req.body.phoneNumber,
        countryCode: req.body.countryCode,
        isDeleted: false,
      });

      if (!customerData || (customerData && !customerData.isVerified)) {
        if (customerData && !customerData.isVerified) {
          await CustomerModel.deleteOne({
            _id: customerData._id,
          });
        }

        //create customer
        customerData = await CustomerModel.create({
          ...req.body,
          created_at: getCurrentUnix(),
          updated_at: getCurrentUnix(),
        });

        // generate otp
        const secret = generateSecret();
        const purpose = "SIGNUP-LOGIN";
        const { code, newOtpSecret } = generateTOTP(secret, purpose);
        customerData.otpSecret.push(newOtpSecret);
        await customerData.save();
        console.log(
          `SIGNUP OR LOGIN PHONE:- ` + req.body.phoneNumber + ` OTP :- ` + code
        );

        //send otp  TO DO
        return res.status(StatusCodes.OK).send(
          responseGenerators(
            {
              isNew: true,
              id: customerData._id,
              test: code, // Temporary
            },
            StatusCodes.OK,
            OTP.SUCCESS,
            0
          )
        );
      } else {
        return res.status(StatusCodes.OK).send(
          responseGenerators(
            {
              isNew: false,
              id: customerData._id,
            },
            StatusCodes.OK,
            CUSTOMER_MESSAGE.LOGIN_SUCCESS,
            0
          )
        );
      }
    } else {
      throw new CustomError("Please provide a valid login type");
    }
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

/** customer OTP verification, first time OTP verification */
export const signupOrLoginOTPVerificationHandler = async (req, res) => {
  try {
    await signupOrLoginOTPVerificationValidation.validateAsync(req.body);

    let { id, otp, password, confirmPassword } = req.body;

    if (password !== confirmPassword)
      throw new CustomError(` Pin and Confirm pin should be identical`);

    let customerData = await CustomerModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customerData) throw new CustomError(`Customer not found`);

    if (customerData.isVerified)
      throw new CustomError(`Customer already verified`);

    const purpose = "SIGNUP-LOGIN";
    let otpSecret = customerData.otpSecret.filter((e) => e.purpose == purpose);

    if (!otpSecret || !otpSecret.length)
      throw new CustomError("No pending OTP found for customer.");

    let isValid = verifyTotp(otpSecret.reverse()[0].secret, otp);

    if (isValid) {
      await CustomerModel.findOneAndUpdate(
        { _id: customerData._id },
        {
          otpSecret: [],
          termAndCondition: true,
          isVerified: true,
          password: await hashPassword(password.toString()),
        }
      );

      // create wallet for customer.
      const wallet = new WalletModel({
        customerId: customerData?._id,
        amount: 0.0,
        created_at: getCurrentUnix(),
        created_by: customerData?._id,
        updated_by: customerData?._id,
        updated_at: getCurrentUnix(),
      });

      // Saving the wallet to the database
      await wallet.save();

      // welcome message
      return res.status(StatusCodes.OK).send(
        responseGenerators(
          {
            id: customerData._id,
            isVerified: true,
          },
          StatusCodes.OK,
          OTP.VERIFIED_OTP,
          0
        )
      );
    } else {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(
          responseGenerators(
            null,
            StatusCodes.BAD_REQUEST,
            OTP.INVALID_OTP,
            true
          )
        );
    }
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

/**  This is for login user using pin  */
export const loginHandler = async (req, res) => {
  try {
    // validation
    await loginValidation.validateAsync(req.body);

    // check exist
    let customerData = await CustomerModel.findById(req.body.id);

    if (!customerData || customerData.isDeleted)
      throw new CustomError(`Customer not found`);

    // is verified
    if (!customerData.isVerified)
      throw new CustomError(`Customer  not  verified`);

    if (customerData.isBlocked)
      throw new CustomError(
        `Your account is blocked by Admin, Please contact Administrator.`
      );

    //compare the pin
    let passwordMatch = await comparePassword(
      req.body.password.toString(),
      customerData.password
    );

    if (!passwordMatch) throw new CustomError(`Please provide a valid pin`);

    // provide session with JWT
    let loginDataRaw = customerData.toJSON();
    customerData.lastLogin = getCurrentUnix();
    customerData.save();
    delete loginDataRaw.password;
    let jswToken = await getJwt({
      id: loginDataRaw._id,
    });

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          token: encryptData(jswToken),
          userData: loginDataRaw,
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

/** Update the customer */
export const updateCustomerHandler = async (req, res) => {
  try {
    // validation
    await updateCustomerValidation.validateAsync({
      ...req.body,
      ...req.params,
    });

    // not need to check  clientId

    // check for verification
    if (!req.session?.isVerified)
      throw new CustomError(`Please verify your account`);

    // find customer and update customer
    let customerData = await CustomerModel.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      {
        $set: {
          isDeleted: false,
          updated_at: getCurrentUnix(),
          updated_by: req.session._id,
          ...req.body,
        },
      },
      { new: true }
    );

    // delete password
    if (customerData.password) delete customerData.password;
    customerData.save();

    return res
      .status(StatusCodes.OK)
      .send(
        responseGenerators(customerData.toJSON(), StatusCodes.OK, "SUCCESS", 0)
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

/** list customer */
export const listCustomerHandler = async (req, res) => {
  try {
    // await listCustomerValidation.validateAsync(req.body);
    // checkClientIdAccess(req.session, req.body.clientId);

    let where = {
      isDeleted: false,
    };

    if (req.query?.search) {
      where = {
        ...where,
        ...{
          $or: [
            { fname: new RegExp(req.query.search.toString(), "i") },
            { lname: new RegExp(req.query.search.toString(), "i") },
            { phoneNumber: new RegExp(req.query.search.toString(), "i") },
            { email: new RegExp(req.query.search.toString(), "i") },
          ],
        },
      };
    }

    const pagination = setPagination(req.query);

    const customers = await CustomerModel.find(where)
      .select("-password")
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean()
      .exec();

    if (!customers) throw new CustomError(`No Customer found.`);
    let total_count = await CustomerModel.count(where);

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          paginatedData: customers,
          totalCount: total_count,
          itemsPerPage: pagination.limit,
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

/** single customer */
export const singleCustomerHandler = async (req, res) => {
  try {
    await singleCustomerValidation.validateAsync({
      ...req.body,
      ...req.params,
    });

    // checkClientIdAccess(req.session, req.body.clientId);

    let where = {
      _id: req.params.id,
      isDeleted: false,
      // clientId: req.session.clientId || req.query.clientId,
    };

    const aggregationPipeline = [
      {
        $match: where,
      },
      {
        $lookup: {
          from: "wallets",
          localField: "_id",
          foreignField: "customerId",
          as: "walletData",
        },
      },
    ];

    const customer = await CustomerModel.aggregate(aggregationPipeline); // password

    if (customer.length) throw new CustomError("Customer not found");
    delete customer[0]?.password;

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          singleCustomerData: customer[0],
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

/** get-customer-select */
export const getCustomerSelectHandler = async (req, res) => {
  try {
    // await getCustomerSelectValidation.validateAsync(req.body);

    let where = {
      isDeleted: false,
      // clientId: req?.session?.clientId || req?.body?.clientId,
    };

    const pagination = setPagination(req.query);

    if (!req.query?.search)
      return res.status(StatusCodes.OK).send(
        responseGenerators(
          {
            paginatedData: [],
            totalCount: 0,
            itemsPerPage: pagination.limit,
          },
          StatusCodes.OK,
          "SUCCESS",
          0
        )
      );

    where = {
      ...where,
      ...{
        $or: [
          { fname: new RegExp(req.query.search.toString(), "i") },
          { lname: new RegExp(req.query.search.toString(), "i") },
          { phoneNumber: new RegExp(req.query.search.toString(), "i") },
          { email: new RegExp(req.query.search.toString(), "i") },
        ],
      },
    };

    const customer = await CustomerModel.find(where)
      .select("_id fname lname email phoneNumber")
      .sort(pagination.sort)
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean()
      .exec();

    let total_count = await CustomerModel.countDocuments(where);

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          paginatedData: customer,
          totalCount: total_count,
          itemsPerPage: pagination.limit,
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

/** Block/Unblock user */
export const toggleBlockUnblockHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) throw new CustomError("Please provide a valid ID");

    if (status == undefined) throw new CustomError("Invalid status provided");

    const customer = await CustomerModel.findById(id);
    if (!customer) {
      throw new CustomError("Customer not found");
    }

    const newStatus = status ? true : false;

    // Toggle isBlocked field based on new status
    const updatedCustomer = await CustomerModel.findByIdAndUpdate(
      id,
      { isBlocked: newStatus },
      { new: true }
    );

    res.status(StatusCodes.OK).json({
      message: `Customer ${
        updatedCustomer.isBlocked ? "blocked" : "unblocked"
      } successfully`,
      customer: updatedCustomer,
    });
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

/** Get Customer Info API for Customer */
export const infoCustomerHandler = async (req, res) => {
  try {
    let customerData = await CustomerModel.findOne({
      _id: req.session._id,
    })
      .lean()
      .exec();

    delete customerData?.password;
    delete customerData?.otpSecret;

    let currentTransaction = await TransactionModel.find({
      customerId: req.session._id,
      status: "InProgress",
    }).select("_id serialNumber status occpTransactionId");

    customerData.currentTransaction = currentTransaction;
    return res
      .status(StatusCodes.OK)
      .send(responseGenerators(customerData, StatusCodes.OK, "SUCCESS", 0));
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

/** FORGET Password API for Customer */
export const forgetPasswordHandler = async (req, res) => {
  try {
    await forgotPasswordValidation.validateAsync(req.body);

    /** where clause */
    let where = {};

    /** if email exits */
    if (req.body.type == "EMAIL") {
      if (req.body.email)
        throw new CustomError("Please provide an email address");
      where.email = req.body.email.toLowerCase();
    } else if (req.body.type == "PHONE") {
      if (!req.body.phoneNumber)
        throw new CustomError("Please enter a phone number");
      where.phoneNumber = req.body.phoneNumber.toLowerCase();
    }
    const customerData = await CustomerModel.findOne(where);

    if (!customerData) {
      throw new CustomError("User with this email address does not exist");
    }

    // We will send the OTP and customer need to verify that OTP
    const secret = generateSecret();
    const purpose = "RESET-PIN";
    const { code, newOtpSecret } = generateTOTP(secret, purpose);
    customerData.otpSecret.push(newOtpSecret);
    await customerData.save();
    console.log(`FORGOT PIN:- OTP :-` + code);

    return res.status(StatusCodes.OK).send(
      responseGenerators(
        {
          otp: code,
          _id: customerData._id,
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

/** RESET Password API for Customer with OTP verification */
export const resetPasswordHandler = async (req, res) => {
  try {
    /** validation */
    await resetPasswordValidation.validateAsync(req.body);

    const { _id, otp, new_password, compare_password } = req.body;

    if (!otp) throw new CustomError("Please provide valid OTP");

    const customerData = await CustomerModel.findById(_id);

    if (!customerData) {
      throw new CustomError("User with this customer ID does not exist");
    }

    // verify OTP here.
    const purpose = "RESET-PIN";
    let otpSecret = customerData.otpSecret.filter((e) => e.purpose == purpose);

    if (!otpSecret || !otpSecret.length)
      throw new CustomError("No pending OTP found for customer.");

    let isValid = verifyTotp(otpSecret.reverse()[0].secret, otp);

    if (!isValid) throw new CustomError("Please provide valid OTP");

    if (new_password !== compare_password) {
      throw new CustomError("New password and compare password do not match");
    }

    const hashedPassword = hashSync(new_password, 10);

    await CustomerModel.findByIdAndUpdate(customerData._id, {
      password: hashedPassword,
      updated_at: getCurrentUnix(),
    });

    return res
      .status(StatusCodes.OK)
      .send(responseGenerators(StatusCodes.OK, "SUCCESS", 0));
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
