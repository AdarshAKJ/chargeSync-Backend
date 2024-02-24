import mongoose from "mongoose";
import { generatePublicId } from "../commons/common-functions";

const CustomerSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    trim: true,
    default: generatePublicId,
  },
  clientId: { type: String, required: true, trim: true },
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  email: { type: String, trim: true },
  phoneNumber: { type: String },
  address: { type: Object, trim: true },
  dob: { type: String },
  countryCode: { type: String },
  created_by: { type: String },
  updated_by: { type: String },
  created_at: { type: String },
  updated_at: { type: String },
  isDeleted: { type: Boolean, default: false },
});

const CustomerModel = mongoose.model("customer", CustomerSchema);

export default CustomerModel;
