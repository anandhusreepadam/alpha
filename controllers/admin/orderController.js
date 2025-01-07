const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Product = require('../../models/productSchema');


const loadOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';
        const query = {};
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }
        if (statusFilter) {
            query.status = statusFilter;
        }
        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);
        res.render('orderManagement', {
            orders,
            currentPage: page,
            totalPages,
            search,
            statusFilter    
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
};

const orderDetails = async (req, res) => {
    try {
        const orderId = req.query.id;
        const order = await Order.findById(orderId)
            .populate('userId')
            .populate('items.productId')
            .lean();
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('order-details', { order, title: 'Order Details' });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateStatus = async (req, res) => {
    const { orderId, status, userId } = req.body;
    try {
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: 'Invalid data' });
        }
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true, runValidators: true }
        );
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (status == 'Cancelled' || status == 'Returned') {
            const bulkOps = updatedOrder.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.productId._id },
                    update: { $inc: { quantity: item.quantity } },
                },
            }));
            await Product.bulkWrite(bulkOps);
            if (updatedOrder.paymentMethod != 'COD') {
                const wallet = await Wallet.findOne({ userId: userId });
                if (!wallet) {
                    const wallet = new Wallet({
                        order: updatedOrder._id,
                        userId,
                        balance: 0,
                        transactions: [],
                    });
                }
                const refundAmount = updatedOrder.finalAmount;
                wallet.balance += refundAmount;
                wallet.transactions.unshift({
                    order: updatedOrder._id,
                    orderId: updatedOrder.orderId,
                    type: 'refund',
                    amount: refundAmount,
                    description: `Refund for cancelled order #${updatedOrder._id}`,
                    date: new Date(),
                });
                await wallet.save();

                    updatedOrder.paymentStatus = "Refunded";
                    updatedOrder.save();

                return res.status(200).json({
                    success: true,
                    message: `Order ${status} and amount refunded to wallet.`,
                });
            }

            updatedOrder.paymentStatus = "Refunded";
            updatedOrder.save();

            return res.status(200).json({ success: true, message: `Order successfully ${status}` });
        } else if (status == 'Delivered') {
            updatedOrder.paymentStatus = 'Paid';
            updatedOrder.save();
        }
        res.status(200).json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    loadOrders,
    orderDetails,
    updateStatus
};