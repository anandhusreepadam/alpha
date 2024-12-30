//Database Schemas
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');

const PDFDocument = require("pdfkit");
const mongoose = require('mongoose');
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
    console.log('in place order')
    try {
        const user = await User.findOne({ _id: req.session.user._id })
        const { addressId, paymentMethod, couponCode } = req.body;
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

        let discount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode });
            if (!coupon) {
                return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
            }

            if (coupon.expiryDate < new Date()) {
                return res.status(400).json({ success: false, message: 'Coupon has expired.' });
            }

            if (user.usedCoupons.includes(coupon._id)) {
                return res.status(400).json({ success: false, message: 'Coupon already used.' });
            }

            discount = coupon.discountType === 'percentage'
                ? (totalAmount * coupon.discountValue) / 100
                : Math.min(coupon.discountValue, totalAmount);

            user.usedCoupons.push(coupon._id);
            await user.save();
        }

        const finalAmount = totalAmount - discount;

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
                    paymentStatus:'Pending',
                    totalAmount,
                    finalAmount,
                    couponCode,
                    discount
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
            if(finalAmount>1000){
                return res.status(400).json({success:false,message:'Cash on Delivery is not available for Orders above ₹1000!'})
            }
            const newOrder = new Order({
                userId: user._id,
                address: selectedAddress,
                items: cartItems.items,
                paymentMethod,
                totalAmount,
                finalAmount,
                couponCode,
                discount
            });
            console.log('Generated Order ID:', newOrder.orderId);
            await newOrder.save();
            res.status(200).json({
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
                couponCode,
                discount
            });

            console.log('Generated Order ID:', newOrder.orderId);
            await newOrder.save();

            wallet.transactions.unshift({
                order: newOrder._id,
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
            { status: 'Cancelled',paymentStatus:'Refunded' },
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
                    order: updatedOrder._id,
                    userId: user._id,
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

const invoiceGenerate = async (req, res) => {
    const orderId = req.query.orderId;
    const order = await Order.findById(orderId).populate('items.productId');

    if (!order) {
        return res.status(404).send('Order not found');
    }
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderId}.pdf`);

    doc.pipe(res);

    doc
        .image("logo.png", 50, 45, { width: 150 })
        .fillColor("#444444")
        .fontSize(20)
        .fontSize(10)
        .text("Chanel One", 200, 50, { align: "right" })
        .text("Balussery", 200, 65, { align: "right" })
        .text("Kozhikode,673612", 200, 80, { align: "right" })
        .moveDown();

    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Invoice", 50, 160);

    generateHr(doc, 185);

    const customerInformationTop = 200;

    doc
        .fontSize(10)
        .text("Invoice Number:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(order.orderId, 150, customerInformationTop)
        .font("Helvetica")
        .text("Invoice Date:", 50, customerInformationTop + 15)
        .text(formatDate(new Date()), 150, customerInformationTop + 15)
        .text("Payment Method:", 50, customerInformationTop + 30)
        .text(order.paymentMethod, 150, customerInformationTop + 30)
        .font("Helvetica-Bold")
        .text(order.address.name, 300, customerInformationTop)
        .font("Helvetica")
        .text(order.address.fullAddress, 300, customerInformationTop + 15)
        .text(order.address.city + ", " + order.address.state + ", " + order.address.pincode, 300, customerInformationTop + 30)
        .moveDown();

    generateHr(doc, 252);

    let i;
    const invoiceTableTop = 330;

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Item",
        "Description",
        "Price",
        "Quantity",
        "Total"
    );

    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    for (i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.productId.productName,
            item.productId.description,
            item.price.toFixed(2),
            item.quantity,
            (item.quantity * item.price).toFixed(2)
        );

        generateHr(doc, position + 20);
    }

    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    generateTableRow(doc, subtotalPosition, "", "", "Subtotal", "", order.totalAmount.toFixed(2));

    const paidToDatePosition = subtotalPosition + 20;
    generateTableRow(doc, paidToDatePosition, "", "", "Discount", "", order.discount.toFixed(2));

    const duePosition = paidToDatePosition + 25;
    doc.font("Helvetica-Bold");
    generateTableRow(doc, duePosition, "", "", "Final Amount", "",order.finalAmount.toFixed(2));
    doc.font("Helvetica");

    generateFooter(doc);


    function generateHr(doc, y) {
        doc
            .strokeColor("#aaaaaa")
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }

    function formatDate(date) {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        return year + "/" + month + "/" + day;
    }

    function generateTableRow(
        doc,
        y,
        item,
        description,
        unitCost,
        quantity,
        lineTotal
    ) {
        doc
            .fontSize(10)
            .text(item, 50, y)
            .text(description, 150, y)
            .text(unitCost, 280, y, { width: 90, align: "right" })
            .text(quantity, 370, y, { width: 90, align: "right" })
            .text(lineTotal, 0, y, { align: "right" });
    }

    function generateFooter(doc) {
        doc
          .fontSize(10)
          .text("Thank you for purchasing from Chanel One! Hope you enjoy your purchase.", 50, doc.page.height-90,{ align: "center", width: 500 });
      }

    doc.end();
};


module.exports = {
    loadCheckout,
    placeOrder,
    orderPlaced,
    loadOrders,
    loadOrderDetails,
    cancelOrder,
    returnOrder,
    invoiceGenerate,
}