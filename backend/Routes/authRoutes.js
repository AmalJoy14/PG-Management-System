import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Owner, Tenant } from "../models/user.js";
import Room from "../models/room.js";
import Payment from "../models/payment.js";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Owner Signup Route
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password, phone, pgName } = req.body;

        // Check for existing owner
        const existingOwner = await Owner.findOne({ email });
        if (existingOwner) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save new owner
        const owner = await Owner.create({
            fullname: name,
            email,
            password: hashedPassword,
            phone,
            pgName,
            category: "owner"
        });

        // Create token
        const token = jwt.sign({ 
            email: owner.email, 
            id: owner._id, 
            category: "owner" 
        }, process.env.ACCESS_TOKEN_SECRET);

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 7,
            path: "/",
        });

        res.status(201).json({
            message: "Owner registered successfully",
            user: {
                id: owner._id,
                name: owner.fullname,
                email: owner.email,
                category: owner.category,
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating owner account", error: error.message });
    }
});

// Signin Route
router.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Try to find as owner first
        let user = await Owner.findOne({ email });
        let category = "owner";

        // If not found, try tenant
        if (!user) {
            user = await Tenant.findOne({ email });
            category = "tenant";
        }

        if (!user) {
            return res.status(404).json({ message: "Email or password is incorrect!" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(404).json({ message: "Email or password is incorrect!" });
        }

        user.lastSignIn = new Date();
        await user.save();

        const token = jwt.sign({ 
            email: user.email, 
            id: user._id, 
            category 
        }, process.env.ACCESS_TOKEN_SECRET);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 7,
            path: "/",
        });

        res.status(200).json({
            message: "User signed in successfully",
            user: {
                id: user._id,
                name: user.fullname,
                email: user.email,
                category: category,
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error signing in", error: error.message });
    }
});

// Logout Route
router.get("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
    });
    res.status(200).json({ message: "User logged out successfully" });
});

// Add Tenant Route (Only for Owners)
router.post("/add-tenant", authenticateToken, async (req, res) => {
    try {
        const { name, email, password, roomNumber, rentAmount, joinDate, phone, emergencyContact, securityDeposit } = req.body;

        // Get owner from token
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can add tenants" });
        }

        // Check if tenant email already exists
        const existingTenant = await Tenant.findOne({ email });
        const existingOwner = await Owner.findOne({ email });
        if (existingTenant || existingOwner) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create or find room
        let room = await Room.findOne({ roomNumber, ownerId: owner._id });
        if (!room) {
            room = await Room.create({
                roomNumber,
                ownerId: owner._id,
                rentAmount,
                status: "available"
            });
        } else {
            // Prevent assigning an already occupied/non-available room
            const notAvailable = room.status !== "available" || room.tenantId;
            if (notAvailable) {
                return res.status(400).json({ message: "Selected room is not available" });
            }
        }

        // Create tenant
        const tenant = await Tenant.create({
            fullname: name,
            email,
            password: hashedPassword,
            category: "tenant",
            ownerId: owner._id,
            phone,
            emergencyContact,
            rentAmount,
            securityDeposit: securityDeposit || 0,
            joinDate: joinDate ? new Date(joinDate) : new Date(),
            status: "active"
        });

        // Update room with tenant
        room.tenantId = tenant._id;
        room.status = "occupied";
        room.currentOccupancy = 1;
        await room.save();

        res.status(201).json({
            message: "Tenant added successfully",
            tenant: {
                id: tenant._id,
                name: tenant.fullname,
                email: tenant.email,
                roomNumber: room.roomNumber,
                rentAmount: tenant.rentAmount,
                joinDate: tenant.joinDate
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error adding tenant", error: error.message });
    }
});

// Get All Tenants for Owner
router.get("/tenants", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can view tenants" });
        }

        const tenants = await Tenant.find({ ownerId: owner._id }).select("-password");
        
        // Get room details for each tenant
        const tenantsWithRooms = await Promise.all(tenants.map(async (tenant) => {
            const room = await Room.findOne({ tenantId: tenant._id });
            return {
                _id: tenant._id,
                name: tenant.fullname,
                email: tenant.email,
                phone: tenant.phone,
                roomNumber: room?.roomNumber || "N/A",
                rentAmount: tenant.rentAmount,
                joinDate: tenant.joinDate,
                status: tenant.status
            };
        }));

        res.status(200).json({ tenants: tenantsWithRooms });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tenants", error: error.message });
    }
});

// Update Tenant Rent (Owner only)
router.patch("/tenants/:tenantId/rent", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can update rent" });
        }

        const { tenantId } = req.params;
        const { rentAmount, effectiveFrom } = req.body;

        if (!rentAmount || Number(rentAmount) <= 0) {
            return res.status(400).json({ message: "Valid rentAmount is required" });
        }

        const tenant = await Tenant.findOne({ _id: tenantId, ownerId: owner._id });
        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        tenant.rentAmount = Number(rentAmount);
        await tenant.save();

        // Optionally update unpaid future payments to new amount
        if (effectiveFrom) {
            await Payment.updateMany(
                {
                    tenantId: tenant._id,
                    status: { $ne: "paid" },
                    month: { $gte: effectiveFrom }
                },
                { $set: { amount: Number(rentAmount) } }
            );
        }

        res.status(200).json({ message: "Rent updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error updating rent", error: error.message });
    }
});

// Remove Tenant (Owner only) - frees the room and deletes tenant account
router.delete("/tenants/:tenantId", authenticateToken, async (req, res) => {
    try {
        const owner = await Owner.findOne({ email: req.user.email });
        if (!owner) {
            return res.status(403).json({ message: "Only owners can remove tenants" });
        }

        const { tenantId } = req.params;
        const tenant = await Tenant.findOne({ _id: tenantId, ownerId: owner._id });
        if (!tenant) {
            return res.status(404).json({ message: "Tenant not found" });
        }

        // Free the room
        const room = await Room.findOne({ tenantId: tenant._id, ownerId: owner._id });
        if (room) {
            room.tenantId = null;
            room.status = "available";
            room.currentOccupancy = 0;
            await room.save();
        }

        // Permanently delete tenant account
        await Tenant.deleteOne({ _id: tenant._id });

        res.status(200).json({ message: "Tenant account deleted and room freed" });
    } catch (error) {
        res.status(500).json({ message: "Error removing tenant", error: error.message });
    }
});

export default router;
