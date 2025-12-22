import express from "express";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import { Owner, Tenant } from "../models/user.js";
import Room from "../models/room.js";
import Payment from "../models/payment.js";
import Refund from "../models/refund.js";

const router = express.Router();

// Helper to compute unpaid dues for a tenant
async function computeUnpaidDue(tenantId) {
  const payments = await Payment.find({ tenantId, status: { $ne: "paid" } });
  return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

// List settlements (owner)
router.get("/settlements", authenticateToken, async (req, res) => {
  try {
    const owner = await Owner.findOne({ email: req.user.email });
    if (!owner) return res.status(403).json({ message: "Only owners can view settlements" });

    const { tenantId } = req.query;
    const filter = { ownerId: owner._id };
    if (tenantId) filter.tenantId = tenantId;

    const settlements = await Refund.find(filter)
      .populate("tenantId", "fullname email")
      .populate("roomId", "roomNumber")
      .sort({ createdAt: -1 });
    res.status(200).json(settlements);
  } catch (error) {
    res.status(500).json({ message: "Error fetching settlements", error: error.message });
  }
});

// Initiate settlement for a tenant
router.post("/settlements/initiate", authenticateToken, async (req, res) => {
  try {
    const owner = await Owner.findOne({ email: req.user.email });
    if (!owner) return res.status(403).json({ message: "Only owners can initiate settlements" });

    const { tenantId, damages = 0, cleaning = 0, noticePenalty = 0, other = 0, notes } = req.body;
    if (!tenantId) return res.status(400).json({ message: "tenantId is required" });

    const tenant = await Tenant.findOne({ _id: tenantId, ownerId: owner._id });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const room = await Room.findOne({ tenantId: tenant._id }) || await Room.findOne({ ownerId: owner._id, tenantId: null });
    const depositAmount = Number(tenant.securityDeposit || 0);
    const unpaidDue = await computeUnpaidDue(tenant._id);

    const totalDeductions = Number(unpaidDue) + Number(damages) + Number(cleaning) + Number(noticePenalty) + Number(other);
    const refundableAmount = Math.max(0, depositAmount - totalDeductions);
    const balanceDueFromTenant = Math.max(0, totalDeductions - depositAmount);

    const refund = await Refund.create({
      tenantId: tenant._id,
      ownerId: owner._id,
      roomId: room?._id,
      tenantName: tenant.fullname,
      tenantEmail: tenant.email,
      roomNumber: room?.roomNumber?.toString?.() || undefined,
      depositAmount,
      deductions: { unpaidDue, damages, cleaning, noticePenalty, other, notes },
      refundableAmount,
      balanceDueFromTenant,
      status: "initiated",
    });

    res.status(201).json({ message: "Settlement initiated", refund });
  } catch (error) {
    res.status(500).json({ message: "Error initiating settlement", error: error.message });
  }
});

// Approve settlement
router.patch("/settlements/:id/approve", authenticateToken, async (req, res) => {
  try {
    const owner = await Owner.findOne({ email: req.user.email });
    if (!owner) return res.status(403).json({ message: "Only owners can approve settlements" });

    const { id } = req.params;
    const { deductions } = req.body; // optional override

    const refund = await Refund.findOne({ _id: id, ownerId: owner._id });
    if (!refund) return res.status(404).json({ message: "Settlement not found" });

    if (deductions) {
      refund.deductions = { ...refund.deductions, ...deductions };
      const totalDeductions = Object.keys(refund.deductions)
        .filter((k) => ["unpaidDue", "damages", "cleaning", "noticePenalty", "other"].includes(k))
        .reduce((sum, k) => sum + Number(refund.deductions[k] || 0), 0);
      refund.refundableAmount = Math.max(0, Number(refund.depositAmount) - totalDeductions);
      refund.balanceDueFromTenant = Math.max(0, totalDeductions - Number(refund.depositAmount));
    }

    refund.status = "approved";
    await refund.save();
    res.status(200).json({ message: "Settlement approved", refund });
  } catch (error) {
    res.status(500).json({ message: "Error approving settlement", error: error.message });
  }
});

// Mark settlement as paid
router.patch("/settlements/:id/pay", authenticateToken, async (req, res) => {
  try {
    const owner = await Owner.findOne({ email: req.user.email });
    if (!owner) return res.status(403).json({ message: "Only owners can pay settlements" });

    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const refund = await Refund.findOne({ _id: id, ownerId: owner._id });
    if (!refund) return res.status(404).json({ message: "Settlement not found" });

    refund.paymentMethod = paymentMethod || refund.paymentMethod || "cash";
    refund.transactionId = transactionId || refund.transactionId;
    refund.processedDate = new Date();
    refund.processedBy = owner.fullname || owner.email;
    refund.status = "paid";
    await refund.save();

    // Free the room and delete the tenant after successful settlement payment
    try {
      const tenant = await Tenant.findOne({ _id: refund.tenantId, ownerId: owner._id });
      if (tenant) {
        const room = await Room.findOne({ tenantId: tenant._id, ownerId: owner._id });
        if (room) {
          room.tenantId = null;
          room.status = "available";
          room.currentOccupancy = 0;
          await room.save();
        }
        await Tenant.deleteOne({ _id: tenant._id });
      }
    } catch (cleanupErr) {
      // Non-fatal: settlement remains paid even if cleanup partially fails
    }

    res.status(200).json({ message: "Settlement marked as paid; tenant deleted and room freed", refund });
  } catch (error) {
    res.status(500).json({ message: "Error paying settlement", error: error.message });
  }
});

export default router;
