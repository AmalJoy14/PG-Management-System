import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";
import { authenticateToken } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Signup Route
router.post("/signup", async (req, res) => {
    const { name, email, password, category } = req.body;

    // Check for existing user
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user - Only owners can sign up publicly
    const user = await userModel.create({
        name,
        email,
        password: hashedPassword,
        category: "owner", // Force owner for public signup
    });

    // Create token
    const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET);

    // Set cookie
    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
    });

    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            category: user.category,
        }
    });
});

// Signin Route
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email or password is incorrect!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(404).json({ message: "Email or password is incorrect!" });

    user.lastSignIn = new Date();
    await user.save();

    const token = jwt.sign({ email: user.email }, process.env.ACCESS_TOKEN_SECRET);

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
            name: user.name,
            email: user.email,
            category: user.category,
        }
    });
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
        const { name, email, password, roomNumber, rentAmount } = req.body;

        // Get owner from token
        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can add tenants" });
        }

        // Check if tenant email already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create tenant
        const tenant = await userModel.create({
            name,
            email,
            password: hashedPassword,
            category: "tenant",
            ownerId: owner._id,
            roomNumber,
            rentAmount,
        });

        res.status(201).json({
            message: "Tenant added successfully",
            tenant: {
                id: tenant._id,
                name: tenant.name,
                email: tenant.email,
                roomNumber: tenant.roomNumber,
                rentAmount: tenant.rentAmount,
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error adding tenant", error: error.message });
    }
});

// Get All Tenants for Owner
router.get("/tenants", authenticateToken, async (req, res) => {
    try {
        const owner = await userModel.findOne({ email: req.user.email });
        if (!owner || owner.category !== "owner") {
            return res.status(403).json({ message: "Only owners can view tenants" });
        }

        const tenants = await userModel.find({ ownerId: owner._id }).select("-password");
        res.status(200).json({ tenants });
    } catch (error) {
        res.status(500).json({ message: "Error fetching tenants", error: error.message });
    }
});

export default router;
