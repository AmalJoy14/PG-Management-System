import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ["owner", "tenant"],
        default: "tenant",
        required: true
    },
    // Tenant-specific fields
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: function() { return this.category === "tenant"; }
    },
    roomNumber: {
        type: String,
        required: function() { return this.category === "tenant"; }
    },
    rentAmount: {
        type: Number,
        required: function() { return this.category === "tenant"; }
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    lastSignIn: {
        type: Date
    }
}, { timestamps: true });

const user = mongoose.model("user", userSchema, "user");
export default user;
