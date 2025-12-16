import mongoose from "mongoose";

// Owner Schema
const ownerSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: "owner",
        enum: ["owner"]
    },
    phone: {
        type: String
    },
    address: {
        type: String
    },
    pgName: {
        type: String
    },
    lastSignIn: {
        type: Date
    }
}, { timestamps: true });

// Tenant Schema
const tenantSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: "tenant",
        enum: ["tenant"]
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true
    },
    phone: {
        type: String
    },
    emergencyContact: {
        name: String,
        phone: String,
        relation: String
    },
    rentAmount: {
        type: Number,
        required: true
    },
    securityDeposit: {
        type: Number,
        default: 0
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    leaveDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ["active", "inactive", "left"],
        default: "active"
    },
    lastSignIn: {
        type: Date
    }
}, { timestamps: true });

const Owner = mongoose.model("Owner", ownerSchema);
const Tenant = mongoose.model("Tenant", tenantSchema);

export { Owner, Tenant };
