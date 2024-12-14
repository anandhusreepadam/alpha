const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const mongoose = require('mongoose');



const loadCheckout = async (req, res) => {
    try {
        const user = req.session.user
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        const addressData = await Address.findOne({ userId: user._id });
        if (!cart || cart.items.length === 0) {
            console.log('Nothing in cart');
            return res.redirect('/cart');
        }
        res.render('checkout', {
            title: 'Checkout',
            user,
            cart,
            addresses: addressData ? addressData.address : [],
        });
    } catch (error) {
        console.error('Error rendering checkout:', error);
        res.status(500).render('pageerror');
    }
};

const placeOrder = async (req, res) => {
    try {
        const user = req.session.user;
        const { addressId, paymentMethod } = req.body;
        const userId = new mongoose.Types.ObjectId(user._id);
        const objectAddressId = new mongoose.Types.ObjectId(addressId);
        const address = await Address.aggregate([
            { $match: { userId } },
            { $unwind: "$address" },
            { $match: { "address._id": objectAddressId } },
        ]);

        if (!address.length) {
            return res.status(400).json({ success: false, message: 'Address not found' });
        }
        const selectedAddress = address[0].address;
        const cartItems = await Cart.findOne({ userId: user._id }).populate('items.productId');
        if (!cartItems || !cartItems.items.length) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }
        for (const item of cartItems.items) {
            if (item.productId.quantity< item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.name}.`
                });
            }
        }
        const totalAmount = cartItems.items.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);
        const shippingCharge = 50;
        const finalAmount = totalAmount + shippingCharge;
        const bulkOps = cartItems.items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: { $inc: { quantity: -item.quantity } }
            }
        }));
        await Product.bulkWrite(bulkOps);
        const newOrder = new Order({
            userId: user._id,
            address: selectedAddress,
            items: cartItems.items,
            paymentMethod,
            totalAmount,
            finalAmount,
        });
        console.log('Generated Order ID:', newOrder.orderId);
        await newOrder.save();
        await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [] } });
        return res.status(200).json({
                success: true,
                message: 'Order placed successfully',
                orderId: newOrder.orderId
            });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
};

const orderPlaced = async (req, res) => {
    try {
        const user = req.session.user;
        res.render('orderPlaced', { user, title: 'Order Placed', cart: { items: [] } });
    } catch (error) {
        res.render('pageerror')
    }
};

const loadOrders = async (req, res) => {
    try {
        const user = req.session.user;
        const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
        const cart = user ? await Cart.findOne({ userId: user._id }).populate('items.productId') : null;
        res.render('orders', { orders, title: "Orders", user, cart: cart || { items: [] } })
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('pageerror');
    }
}

const loadOrderDetails = async (req, res) => {
    try {
        const user = req.session.user;
        const orderId = req.query.id;
        const order = await Order.findById(orderId)
            .populate('items.productId')
            .populate('userId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('orderDetails', { order, title: 'Order Details', user, cart: { items: [] } });
    } catch (error) {
        console.error(error);
        res.status(500).send('Something went wrong');
    }
}

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: 'Cancelled' },
            { new: true }
        );
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const bulkOps = updatedOrder.items.map((item) => ({
            updateOne: {
                filter: { _id: item.productId._id },
                update: { $inc: { quantity: item.quantity } },
            },
        }));
        await Product.bulkWrite(bulkOps);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Server Error while canceling order:", error.message);
        res.status(500).json({ success: false, message: 'Internal server error', error });
    }
};

const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { reason } = req.body
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: 'Return Request', message: reason },
            { new: true }
        );
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Server Error while Returning order:", error.message);
        res.status(500).json({ success: false, message: 'Internal server error', error });
    }
};



module.exports = {
    loadCheckout,
    placeOrder,
    orderPlaced,
    loadOrders,
    loadOrderDetails,
    cancelOrder,
    returnOrder
}