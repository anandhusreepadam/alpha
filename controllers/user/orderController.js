const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
const mongoose = require('mongoose');



const loadCheckout = async (req, res) => {
    console.log('hii')
    try {
        const user = req.session.user
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        const addressData = await Address.findOne({ userId: user._id });
        console.log(cart);
        if (!cart || cart.items.length === 0) {
            console.log('Nothing in cart');
            return res.redirect('/cart');
        }

        res.render('checkout', {
            title:'Checkout',
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
        const totalAmount = cartItems.items.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);
        const shippingCharge = 50;
        const finalAmount = totalAmount + shippingCharge;
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
        await 
        res.status(200).json({ 
            success: true, 
            message: 'Order placed successfully', 
            orderId: newOrder.orderId 
        });
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
};

const orderPlaced=async(req,res)=>{
    try {
        const user = req.session.user;
        res.render('orderPlaced',{user,title:'Order Placed',cart:{items:[]}});       
    } catch (error) {
        res.render('pageerror')       
    }
};

const loadOrders = async(req,res)=>{
    try {
        const user = req.session.user;
        console.log(user)
        const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
        const cart = user ? await Cart.findOne({ userId: user._id }).populate('items.productId') : null;
        res.render('orders',{orders,title:"Orders",user,cart:cart||{items:[]}})
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('pageerror');
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
        res.json({ success: true });
    } catch (error) {
        console.error("Server Error while canceling order:", error.message);
        res.status(500).json({ success: false, message: 'Internal server error', error });
    }
};

module.exports={
    loadCheckout,
    placeOrder,
    orderPlaced,
    loadOrders,
    cancelOrder

}