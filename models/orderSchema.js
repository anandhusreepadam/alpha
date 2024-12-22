const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        default: function () {
            return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        },
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    razorpayOrderId:{
        type:String,    
    },
    couponId:{
        type:Schema.Types.ObjectId,
        ref:'Coupon'
    },
    items: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                default: 1,
            },
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
    },
    finalAmount: {
        type: Number,
        required: true,
    },
    address: {
        type: Object,
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'wallet','razorpay'],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Refunded'],
        default: 'Pending',
    },
    status: {
        type: String,
        enum: ['Pending','Shipped', 'Delivered', 'Cancelled','Return Request','Returned'],
        default: 'Pending',
    },
    message:{
        type:String,
        required:false
    },

},{timestamps:true});


const Order = mongoose.model('Order', orderSchema);

module.exports = Order;