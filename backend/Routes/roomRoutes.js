import express from "express";
import { authenticateToken } from "../Middlewares/authMiddleware.js";
import { Owner } from "../models/user.js";
import Room from "../models/room.js";

const router = express.Router();

// Get rooms for the authenticated owner with availability info
router.get("/rooms", authenticateToken, async (req, res) => {
  try {
    const owner = await Owner.findOne({ email: req.user.email });
    if (!owner) {
      return res.status(403).json({ message: "Only owners can view rooms" });
    }

    const rooms = await Room.find({ ownerId: owner._id }).sort({ roomNumber: 1 });

    const data = rooms.map((r) => {
      const isAvailable =
        r.status === "available" &&
        (r.currentOccupancy ?? 0) < (r.capacity ?? 1) &&
        (r.tenantId == null);
      return {
        id: r._id,
        roomNumber: r.roomNumber,
        status: r.status,
        capacity: r.capacity,
        currentOccupancy: r.currentOccupancy,
        tenantId: r.tenantId,
        rentAmount: r.rentAmount,
        available: isAvailable,
      };
    });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching rooms", error: error.message });
  }
});

// Create a new room for the authenticated owner
router.post("/rooms", authenticateToken, async (req, res) => {
  try {
    const owner = await Owner.findOne({ email: req.user.email });
    if (!owner) {
      return res.status(403).json({ message: "Only owners can create rooms" });
    }

    const { roomNumber, rentAmount, capacity } = req.body;
    if (!roomNumber || !rentAmount) {
      return res.status(400).json({ message: "roomNumber and rentAmount are required" });
    }

    const existing = await Room.findOne({ ownerId: owner._id, roomNumber });
    if (existing) {
      return res.status(409).json({ message: "Room already exists" });
    }

    const room = await Room.create({
      roomNumber,
      ownerId: owner._id,
      rentAmount,
      capacity: capacity || 1,
      currentOccupancy: 0,
      status: "available",
    });

    res.status(201).json({
      message: "Room created successfully",
      room: {
        id: room._id,
        roomNumber: room.roomNumber,
        rentAmount: room.rentAmount,
        capacity: room.capacity,
        status: room.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating room", error: error.message });
  }
});

export default router;
 
