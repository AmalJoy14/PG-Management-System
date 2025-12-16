import express from "express";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import userModel from "../models/user.js";
import mongoose from "mongoose";

const router = express.Router();

// Complaint Model Schema (inline for now)
const complaintSchema = new mongoose.Schema({
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
    complaint: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "resolved"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Complaint = mongoose.model("Complaint", complaintSchema);

// Submit a complaint (Tenant only)
router.post("/complaints", authenticateToken, async (req, res) => {
    try {
        const { complaint } = req.body;

        const tenant = await userModel.findOne({ email: req.user.email });
        if (!tenant || tenant.category !== "tenant") {
            return res.status(403).json({ message: "Only tenants can submit complaints" });
        }

        const newComplaint = await Complaint.create({
            tenantId: tenant._id,
            ownerId: tenant.ownerId,
            complaint,
            status: "pending"
        });

        res.status(201).json({
            message: "Complaint submitted successfully",
            complaint: newComplaint
        });
    } catch (error) {
        res.status(500).json({ message: "Error submitting complaint", error: error.message });
    }
});

// Get tenant's own complaints
router.get("/complaints/my-complaints", authenticateToken, async (req, res) => {
    try {
        const tenant = await userModel.findOne({ email: req.user.email });
        if (!tenant || tenant.category !== "tenant") {
            return res.status(403).json({ message: "Only tenants can view their complaints" });
        }

        const complaints = await Complaint.find({ tenantId: tenant._id })
            .sort({ createdAt: -1 });

        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({ message: "Error fetching complaints", error: error.message });
    }
});

// Get all complaints for owner
router.get("/complaints", authenticateToken, async (req, res) => {
    try {
        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can view all complaints" });
        }

        const complaints = await Complaint.find({ ownerId: owner._id })
            .populate("tenantId", "name email roomNumber")
            .sort({ createdAt: -1 });

        // Format response to match frontend expectations
        const formattedComplaints = complaints.map(c => ({
            id: c._id,
            tenant_name: c.tenantId?.name || "Unknown",
            complaint: c.complaint,
            status: c.status,
            createdAt: c.createdAt
        }));

        res.status(200).json(formattedComplaints);
    } catch (error) {
        res.status(500).json({ message: "Error fetching complaints", error: error.message });
    }
});

// Update complaint status (Owner only)
router.patch("/complaints/:id", authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can update complaints" });
        }

        const complaint = await Complaint.findOneAndUpdate(
            { _id: id, ownerId: owner._id },
            { status },
            { new: true }
        );

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        res.status(200).json({ message: "Complaint updated successfully", complaint });
    } catch (error) {
        res.status(500).json({ message: "Error updating complaint", error: error.message });
    }
});

export default router;
