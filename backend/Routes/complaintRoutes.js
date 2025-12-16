import express from "express";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import { Owner, Tenant } from "../models/user.js";
import Complaint from "../models/complaint.js";
import Room from "../models/room.js";

const router = express.Router();

// Submit a complaint (Tenant only)
router.post("/complaints", authenticateToken, async (req, res) => {
    try {
        const { title, complaint, category, priority } = req.body;

        const tenant = await Tenant.findOne({ email: req.user.email });
        if (!tenant) {
            return res.status(403).json({ message: "Only tenants can submit complaints" });
        }

        // Get room and owner info
        const room = await Room.findOne({ tenantId: tenant._id });

        const newComplaint = await Complaint.create({
            tenantId: tenant._id,
            ownerId: tenant.ownerId,
            roomId: room?._id,
            title: title || "General Complaint",
            complaint,
            category: category || "other",
            priority: priority || "medium",
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
        const tenant = await Tenant.findOne({ email: req.user.email });
        if (!tenant) {
            return res.status(403).json({ message: "Only tenants can view their complaints" });
        }

        const complaints = await Complaint.find({ tenantId: tenant._id })
            .populate("roomId", "roomNumber")
            .sort({ createdAt: -1 });

        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({ message: "Error fetching complaints", error: error.message });
    }
});

// Get all complaints for owner
router.get("/complaints", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can view all complaints" });
        }

        const { tenantId, status } = req.query;

        const filter = { ownerId: owner._id };
        if (tenantId) filter.tenantId = tenantId;
        if (status) filter.status = status;

        const complaints = await Complaint.find(filter)
            .populate("tenantId", "fullname email phone")
            .populate("roomId", "roomNumber")
            .sort({ createdAt: -1 });

        // Format response to match frontend expectations
        const formattedComplaints = complaints.map(c => ({
            id: c._id,
            tenant_name: c.tenantId?.fullname || "Unknown",
            tenant_id: c.tenantId?._id,
            room_number: c.roomId?.roomNumber || "N/A",
            title: c.title,
            complaint: c.complaint,
            category: c.category,
            priority: c.priority,
            status: c.status,
            createdAt: c.createdAt,
            resolvedDate: c.resolvedDate
        }));

        res.status(200).json(formattedComplaints);
    } catch (error) {
        res.status(500).json({ message: "Error fetching complaints", error: error.message });
    }
});

// Update complaint status (Owner only)
router.patch("/complaints/:id", authenticateToken, async (req, res) => {
    try {
        const { status, remarks, resolvedBy } = req.body;
        const { id } = req.params;

        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can update complaints" });
        }

        const updateData = { status };
        if (remarks) updateData.remarks = remarks;
        if (resolvedBy) updateData.resolvedBy = resolvedBy;
        if (status === "resolved" || status === "closed") {
            updateData.resolvedDate = new Date();
        }

        const complaint = await Complaint.findOneAndUpdate(
            { _id: id, ownerId: owner._id },
            updateData,
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
