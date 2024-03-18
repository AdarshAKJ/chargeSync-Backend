import express from "express";
import {
  createCustomerHandler,
  forgetPasswordHandler,
  getCustomerSelectHandler,
  infoCustomerHandler,
  listCustomerHandler,
<<<<<<< HEAD
  resetPasswordHandler,
=======
  loginHandler,
>>>>>>> 9131e137de656e8d6bc32d5bd0411bc3ef28f09a
  signupOrLoginOTPVerificationHandler,
  singleCustomerHandler,
  toggleBlockUnblockHandler,
  updateCustomerHandler,
  v2CreateCustomerHandler,
} from "./post";
import { onlyAdminAndClientWithRoles } from "../../middleware/onlyClientAndAdmin";
import { authenticateCustomer } from "../../middleware/authenticateCustomer";
import { privateKeyMiddleware } from "../../middleware/privateKeyCheck";

const customerRouter = express.Router();

//create customer
customerRouter.post("/create", privateKeyMiddleware, createCustomerHandler);

//create customer
customerRouter.post(
  "/v2/create",
  privateKeyMiddleware,
  v2CreateCustomerHandler
);

// otp verification
customerRouter.post(
  "/signup-login-otp-verification",
  privateKeyMiddleware,
  signupOrLoginOTPVerificationHandler
);

// login
customerRouter.post("/login", privateKeyMiddleware, loginHandler);

// update server
customerRouter.post("/update/:id", authenticateCustomer, updateCustomerHandler);

customerRouter.post(
  "/list",
  onlyAdminAndClientWithRoles(["ADMIN", "OPERATION"]),
  listCustomerHandler
);

customerRouter.post(
  "/single-customer/:id",
  onlyAdminAndClientWithRoles(["ADMIN", "OPERATION"]),
  singleCustomerHandler
);

// get-customer-select
customerRouter.post(
  "/get-customer-select",
  onlyAdminAndClientWithRoles(["ADMIN", "OPERATION"]),
  getCustomerSelectHandler
);

// block-unblock
customerRouter.post(
  "/toggle-block-unblock/:id",
  onlyAdminAndClientWithRoles(["ADMIN", "OPERATION"]),
  toggleBlockUnblockHandler
);

<<<<<<< HEAD
customerRouter.post(
  "/forgot-password",
  forgetPasswordHandler
);

customerRouter.post(
  "/reset-password",
  resetPasswordHandler
);
=======
customerRouter.get("/info", authenticateCustomer, infoCustomerHandler);
>>>>>>> 9131e137de656e8d6bc32d5bd0411bc3ef28f09a

export default customerRouter;
