import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: true,
        trim: true
    },
    complaint: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["electrical", "plumbing", "cleaning", "maintenance", "security", "other"],
        default: "other"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["pending", "in_progress", "resolved", "closed"],
        default: "pending"
    },
    resolvedDate: {
        type: Date
    },
    resolvedBy: {
        type: String
    },
    remarks: {
        type: String
    },
    attachments: [{
        url: String,
        type: String
    }]
}, { timestamps: true });

// Index for efficient querying
complaintSchema.index({ tenantId: 1, status: 1 });
complaintSchema.index({ ownerId: 1, status: 1 });

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
