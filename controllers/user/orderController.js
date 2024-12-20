//Database Schemas
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');

//RazorPay Instance
const razorpay = require('../../config/razorpay');



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
            if (item.productId.quantity < item.quantity) {
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

        if (paymentMethod == 'razorpay') {
            try {
                const razorpayOrder = await razorpay.orders.create({
                    currency: 'INR',
                    receipt: `${user._id}_${Date.now()}`,
                    amount: finalAmount * 100,
                })
                const newOrder = new Order({
                    userId: user._id,
                    razorpayOrderId: razorpayOrder.id,
                    address: selectedAddress,
                    items: cartItems.items,
                    paymentMethod,
                    totalAmount,
                    finalAmount,
                });
                console.log('Generated Order ID:', newOrder.orderId);
                console.log('RazorPay ID:', razorpayOrder.id);
                await newOrder.save();
                res.status(200).json({
                    success: true,
                    user: user,
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    key: process.env.RAZORPAY_KEY_ID,
                });
            } catch (error) {
                console.error('Error creating Razorpay order:', error);
                res.status(500).json({ success: false, message: 'Failed to create order.' });
            }
        } else if (paymentMethod == 'COD') {
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
            return res.status(200).json({
                success: true,
                message: 'Order placed successfully',
                orderId: newOrder.orderId
            });

        } else if (paymentMethod == 'wallet') {

            const wallet = await Wallet.findOne({ userId: user._id });

            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient wallet balance.',
                });
            }

            wallet.balance -= finalAmount;

            const newOrder = new Order({
                userId: user._id,
                address: selectedAddress,
                items: cartItems.items,
                paymentMethod,
                totalAmount,
                finalAmount,
                paymentStatus: 'Paid',
            });

            console.log('Generated Order ID:', newOrder.orderId);
            await newOrder.save();

            wallet.transactions.unshift({
                orderId: newOrder.orderId,
                type: 'debit',
                amount: finalAmount,
                date: new Date(),
            })
            await wallet.save();

            res.status(200).json({
                success: true,
                message: 'Order placed successfully using wallet.',
                orderId: newOrder.orderId,
                walletBalance: wallet.balance,
            });
        }
        await Cart.findOneAndUpdate({ userId: user._id }, { $set: { items: [] } });

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
        const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).populate('items.productId');
        const cart = user ? await Cart.findOne({ userId: user._id }) : { items: [] };
        res.render('orders', { orders, title: "Orders", user, cart: cart, currentPage: 'orders' })
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
        const user = req.session.user;
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
        if (updatedOrder.paymentMethod != 'COD') {
            const wallet = await Wallet.findOne({ userId: user._id });
            if (!wallet) {
                const wallet = new Wallet({
                    userId: user._id,
                    balance: 0,
                    transactions: [],
                });
            }
            const refundAmount = updatedOrder.finalAmount;
            wallet.balance += refundAmount;
            wallet.transactions.unshift({
                orderId: updatedOrder.orderId,
                type: 'refund',
                amount: refundAmount,
                description: `Refund for cancelled order #${updatedOrder._id}`,
                date: new Date(),
            });
            await wallet.save();
            return res.status(200).json({
                success: true,
                message: 'Order cancelled and amount refunded to wallet.',
                walletBalance: wallet.balance,
            });
        }
        res.status(200).json({ success: true, message: 'Order successfully Cancelled' });
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