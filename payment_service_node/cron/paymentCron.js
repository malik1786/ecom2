const cron = require('node-cron');
const Order = require('../models/Order');

// Runs every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    console.log("Running pending payments check cron job...");
    try {
        const pendingOrders = await Order.find({ 
            status: { $in: ['CREATED', 'PAYMENT_PENDING'] },
            created_at: { 
                $lte: new Date(Date.now() - 30 * 60 * 1000) // Older than 30 mins
            }
        });

        for (const order of pendingOrders) {
            // Here you would normally integrate with Razorpay/PayU status API
            // to check if the payment actually succeeded but we missed the webhook.
            // For now, if it's too old, we mark it as failed to free up inventory/status.
            
            // Example logic (if older than 24 hours):
            if (Date.now() - new Date(order.created_at).getTime() > 24 * 60 * 60 * 1000) {
                order.status = 'EXPIRED';
                await order.save();
                console.log(`Order ${order.order_id} marked as EXPIRED due to timeout.`);
            }
        }
    } catch (error) {
        console.error("Cron Job Error:", error);
    }
});
