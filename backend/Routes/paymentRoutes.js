import express from "express";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import userModel from "../models/user.js";
import mongoose from "mongoose";

const router = express.Router();

// Payment Model Schema
const paymentSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    month: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["paid", "pending", "overdue"],
        default: "pending"
    },
    paidDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Payment = mongoose.model("Payment", paymentSchema);

// Get all payments for owner
router.get("/payments", authenticateToken, async (req, res) => {
    try {
        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can view all payments" });
        }

        const payments = await Payment.find({ ownerId: owner._id })
            .populate("tenantId", "name email roomNumber")
            .sort({ createdAt: -1 });

        // Format response
        const formattedPayments = payments.map(p => ({
            id: p._id,
            tenant_name: p.tenantId?.name || "Unknown",
            tenant_id: p.tenantId?._id,
            room_number: p.tenantId?.roomNumber,
            amount: p.amount,
            month: p.month,
            status: p.status,
            paidDate: p.paidDate,
            createdAt: p.createdAt
        }));

        res.status(200).json(formattedPayments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching payments", error: error.message });
    }
});

// Get tenant's own payments
router.get("/payments/my-payments", authenticateToken, async (req, res) => {
    try {
        const tenant = await userModel.findOne({ email: req.user.email });
        if (!tenant || tenant.category !== "tenant") {
            return res.status(403).json({ message: "Only tenants can view their payments" });
        }

        const payments = await Payment.find({ tenantId: tenant._id })
            .sort({ createdAt: -1 });

        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching payments", error: error.message });
    }
});

// Create payment record (Owner only)
router.post("/payments", authenticateToken, async (req, res) => {
    try {
        const { tenantId, amount, month, status } = req.body;

        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can create payment records" });
        }

        const payment = await Payment.create({
            tenantId,
            ownerId: owner._id,
            amount,
            month,
            status: status || "pending"
        });

        res.status(201).json({
            message: "Payment record created successfully",
            payment
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating payment", error: error.message });
    }
});

// Update payment status (Owner only)
router.patch("/payments/:id", authenticateToken, async (req, res) => {
    try {
        const { status, paidDate } = req.body;
        const { id } = req.params;

        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can update payments" });
        }

        const updateData = { status };
        if (status === "paid" && !paidDate) {
            updateData.paidDate = new Date();
        } else if (paidDate) {
            updateData.paidDate = paidDate;
        }

        const payment = await Payment.findOneAndUpdate(
            { _id: id, ownerId: owner._id },
            updateData,
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        res.status(200).json({ message: "Payment updated successfully", payment });
    } catch (error) {
        res.status(500).json({ message: "Error updating payment", error: error.message });
    }
});

export default router;
