const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');


const loadOrders = async(req,res)=>{
    try {
        // Pagination Setup
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Filters
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';

        // Query Database
        const query = {};
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }
        if (statusFilter) {
            query.status = statusFilter;
        }

        // Fetch Orders and Total Count
        const orders = await Order.find(query)
            .populate('userId', 'name email') // Populate user details
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        // Render the Template
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

        // Fetch the order and populate user and product details
        const order = await Order.findById(orderId)
            .populate('userId')
            .populate('items.productId')
            .lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Render the order details page
        res.render('orderDetails', { order,title:'Order Details' });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
}



module.exports = {
    loadOrders,
    orderDetails,
};