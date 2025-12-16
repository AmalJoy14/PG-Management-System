import Payment from "../models/payment.js";
import { Tenant } from "../models/user.js";
import Room from "../models/room.js";

// Generate payment records for a tenant from join date to current month
export const generatePaymentRecords = async (tenantId) => {
    try {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) throw new Error("Tenant not found");

        const room = await Room.findOne({ tenantId: tenant._id });
        if (!room) throw new Error("Room not assigned");

        const joinDate = new Date(tenant.joinDate);
        const currentDate = new Date();
        
        const payments = [];
        let date = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);

        while (date <= currentDate) {
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // Check if payment record already exists
            const existingPayment = await Payment.findOne({
                tenantId: tenant._id,
                month: month
            });

            if (!existingPayment) {
                // Create new payment record
                const dueDate = new Date(date.getFullYear(), date.getMonth(), 5); // Due on 5th of each month
                const isOverdue = new Date() > dueDate;
                
                payments.push({
                    tenantId: tenant._id,
                    ownerId: tenant.ownerId,
                    roomId: room._id,
                    amount: tenant.rentAmount,
                    month: month,
                    dueDate: dueDate,
                    status: isOverdue ? "overdue" : "pending"
                });
            }

            date.setMonth(date.getMonth() + 1);
        }

        if (payments.length > 0) {
            await Payment.insertMany(payments);
        }

        return payments;
    } catch (error) {
        throw error;
    }
};

// Generate payment records for all active tenants
export const generateAllPaymentRecords = async (ownerId) => {
    try {
        const tenants = await Tenant.find({ ownerId, status: "active" });
        
        const results = [];
        for (const tenant of tenants) {
            const payments = await generatePaymentRecords(tenant._id);
            results.push({
                tenantId: tenant._id,
                tenantName: tenant.fullname,
                recordsCreated: payments.length
            });
        }

        return results;
    } catch (error) {
        throw error;
    }
};

// Update overdue payments
export const updateOverduePayments = async () => {
    try {
        const currentDate = new Date();
        
        const result = await Payment.updateMany(
            {
                status: "pending",
                dueDate: { $lt: currentDate }
            },
            {
                $set: { status: "overdue" }
            }
        );

        return result;
    } catch (error) {
        throw error;
    }
};
