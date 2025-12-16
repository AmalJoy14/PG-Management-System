import express from "express";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import { Owner, Tenant } from "../models/user.js";
import Payment from "../models/payment.js";
import Room from "../models/room.js";
import { generatePaymentRecords, generateAllPaymentRecords, updateOverduePayments } from "../utils/paymentUtils.js";

const router = express.Router();

// Get all payments for owner (with optional tenant, month, and status filters)
router.get("/payments", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can view all payments" });
        }

        const { tenantId, month, status, unpaid } = req.query;

        // Update overdue payments
        await updateOverduePayments();

        const query = { ownerId: owner._id };
        if (tenantId) {
            query.tenantId = tenantId;
        }
        if (month) {
            query.month = month;
        }
        if (unpaid && String(unpaid).toLowerCase() !== "false" && unpaid !== "0") {
            // Unpaid means anything not paid (pending, overdue, partial)
            query.status = { $ne: "paid" };
        } else if (status) {
            query.status = status;
        }

        const payments = await Payment.find(query)
            .populate("tenantId", "fullname email phone")
            .populate("roomId", "roomNumber")
            .sort({ month: -1 });

        // Format response
        const formattedPayments = payments.map(p => ({
            id: p._id,
            tenant_name: p.tenantId?.fullname || "Unknown",
            tenant_id: p.tenantId?._id,
            room_number: p.roomId?.roomNumber || "N/A",
            amount: p.amount,
            month: p.month,
            dueDate: p.dueDate,
            paidDate: p.paidDate,
            status: p.status,
            paymentMethod: p.paymentMethod,
            transactionId: p.transactionId,
            lateFee: p.lateFee,
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
        const tenant = await Tenant.findOne({ email: req.user.email });
        if (!tenant) {
            return res.status(403).json({ message: "Only tenants can view their payments" });
        }

        const payments = await Payment.find({ tenantId: tenant._id })
            .populate("roomId", "roomNumber")
            .sort({ createdAt: -1 });

        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ message: "Error fetching payments", error: error.message });
    }
});

// Create payment record (Owner only)
router.post("/payments", authenticateToken, async (req, res) => {
    try {
        const { tenantId, roomId, amount, month, dueDate, status, paymentMethod } = req.body;

        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can create payment records" });
        }

        const payment = await Payment.create({
            tenantId,
            ownerId: owner._id,
            roomId,
            amount,
            month,
            dueDate: dueDate || new Date(),
            status: status || "pending",
            paymentMethod: paymentMethod || "cash"
        });

        res.status(201).json({
            message: "Payment record created successfully",
            payment
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating payment", error: error.message });
    }
});

// Update payment status (Owner or Tenant can update)
router.patch("/payments/:id", authenticateToken, async (req, res) => {
    try {
        const { status, paidDate, paymentMethod, transactionId, remarks } = req.body;
        const { id } = req.params;

        // Check if user is owner or tenant
        const owner = await Owner.findOne({ email: req.user.email });
        const tenant = await Tenant.findOne({ email: req.user.email });

        if (!owner && !tenant) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const updateData = { status };
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (transactionId) updateData.transactionId = transactionId;
        if (remarks) updateData.remarks = remarks;
        
        if (status === "paid" && !paidDate) {
            updateData.paidDate = new Date();
        } else if (paidDate) {
            updateData.paidDate = paidDate;
        }

        // Build query based on user type
        const query = { _id: id };
        if (owner) {
            query.ownerId = owner._id;
        } else if (tenant) {
            query.tenantId = tenant._id;
        }

        const payment = await Payment.findOneAndUpdate(
            query,
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

// Generate payment records for a specific tenant
router.post("/payments/generate/:tenantId", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can generate payment records" });
        }

        const { tenantId } = req.params;
        const payments = await generatePaymentRecords(tenantId);

        res.status(201).json({
            message: `Generated ${payments.length} payment records`,
            payments
        });
    } catch (error) {
        res.status(500).json({ message: "Error generating payment records", error: error.message });
    }
});

// Generate payment records for all tenants
router.post("/payments/generate-all", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can generate payment records" });
        }

        const results = await generateAllPaymentRecords(owner._id);

        res.status(201).json({
            message: "Payment records generated for all tenants",
            results
        });
    } catch (error) {
        res.status(500).json({ message: "Error generating payment records", error: error.message });
    }
});

export default router;
