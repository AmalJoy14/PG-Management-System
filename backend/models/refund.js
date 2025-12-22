import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },

  // Snapshots to preserve display after tenant deletion / room changes
  tenantName: { type: String },
  tenantEmail: { type: String },
  roomNumber: { type: String },

  depositAmount: { type: Number, required: true, default: 0 },

  deductions: {
    unpaidDue: { type: Number, default: 0 },
    damages: { type: Number, default: 0 },
    cleaning: { type: Number, default: 0 },
    noticePenalty: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    notes: { type: String },
  },

  refundableAmount: { type: Number, default: 0 },
  balanceDueFromTenant: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["initiated", "approved", "paid", "closed"],
    default: "initiated",
  },

  paymentMethod: { type: String, enum: ["cash", "upi", "bank_transfer", "card", "other", null], default: null },
  transactionId: { type: String },
  processedDate: { type: Date },
  processedBy: { type: String },
}, { timestamps: true });

const Refund = mongoose.model("Refund", refundSchema);
export default Refund;
