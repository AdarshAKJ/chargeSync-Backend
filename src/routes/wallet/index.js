import express from "express";
import {
  getCurrentBalance,
  listAdminWalletTransactions,
  listWalletCustomerTransactions,
} from "./get";
import { onlyAdminAndClientWithRoles } from "../../middleware/onlyClientAndAdmin";
import { authenticateCustomer } from "../../middleware/authenticateCustomer";
import { addAmountToWallet } from "./post";

const walletRouter = express.Router();

// For customers
walletRouter.post(
  "/list",
  authenticateCustomer,
  listWalletCustomerTransactions
);

// For Admin or Operators
walletRouter.post(
  "/list-admin",
  onlyAdminAndClientWithRoles(["ADMIN", "OPERATION"]),
  listAdminWalletTransactions
);

walletRouter.post("/add-amount", authenticateCustomer, addAmountToWallet);

walletRouter.get("/current-balance", authenticateCustomer, getCurrentBalance);

export default walletRouter;
