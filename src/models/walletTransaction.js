import mongoose from "mongoose";
import { generatePublicId } from "../commons/common-functions";

const WalletTransactionSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    trim: true,
    default: generatePublicId,
  },
  clientId: { type: String, required: true, trim: true },
  customerId: { type: String, required: true, trim: true },
  preBalance: { type: Number, required: true, trim: true },
  effectedBalance: { type: Number, required: true, trim: true },
  amount: { type: Number, required: true, trim: true },
  type: {
    type: String,
    required: true,
    enum: ["CREDITED", "DEBITED", "REFUNDED"],
  },
  source: { type: String, required: true, enum: ["WALLET", "RAZORPAY"] },
  created_by: { type: String },
  updated_by: { type: String },
  created_at: { type: String },
  updated_at: { type: String },
  isDeleted: { type: Boolean, default: false },
});

const WalletTransactionModel = mongoose.model(
  "wallet-transaction",
  WalletTransactionSchema
);

export default WalletTransactionModel;