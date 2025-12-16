import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true
    },
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room"
    },
    amount: {
        type: Number,
        required: true
    },
    month: {
        type: String,
        required: true // Format: "YYYY-MM" or "January 2025"
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ["paid", "pending", "overdue", "partial"],
        default: "pending"
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "bank_transfer", "card", "other"],
        default: "cash"
    },
    transactionId: {
        type: String
    },
    remarks: {
        type: String
    },
    lateFee: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Index for efficient querying
paymentSchema.index({ tenantId: 1, month: 1 });
paymentSchema.index({ ownerId: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
