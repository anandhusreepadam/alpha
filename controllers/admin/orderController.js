const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');


const loadOrders = async(req,res)=>{
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
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
};

const orderDetails = async(req,res)=>{
    try {
        const orderId = req.query.id;

        const order = await Order.findById(orderId)
            .populate('userId')
            .populate('items.productId')
            .lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('order-details', { order,title:'Order Details' });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
}

const updateStatus = async(req,res) =>{
    const {orderId,status} = req.body;
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
        res.status(200).json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = {
    loadOrders,
    orderDetails,
    updateStatus
};