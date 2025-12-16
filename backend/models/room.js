import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    roomNumber: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
        default: null
    },
    floor: {
        type: Number
    },
    capacity: {
        type: Number,
        default: 1
    },
    currentOccupancy: {
        type: Number,
        default: 0
    },
    rentAmount: {
        type: Number,
        required: true
    },
    amenities: [{
        type: String
    }],
    status: {
        type: String,
        enum: ["available", "occupied", "maintenance", "reserved"],
        default: "available"
    },
    description: {
        type: String
    }
}, { timestamps: true });

// Compound index to ensure unique room numbers per owner
roomSchema.index({ roomNumber: 1, ownerId: 1 }, { unique: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
