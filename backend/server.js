import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from "./utils/db.js";
import dotenv from 'dotenv';

import authRoutes from "./Routes/authRoutes.js";
import complaintRoutes from "./Routes/complaintRoutes.js";
import paymentRoutes from "./Routes/paymentRoutes.js";

dotenv.config();


const app = express()
const PORT = 3000
const corsOptions = {
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
};

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use("/api", authRoutes);
app.use("/api", complaintRoutes);
app.use("/api", paymentRoutes);

connectDB().then(() =>{
    app.listen(PORT, () => {
        console.log(`Listening to port ${PORT}`);
    })
});
