const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        default: function () {
            return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        },
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
        enum: ['COD', 'Wallet','RazorPay'],
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending','Shipped', 'Delivered', 'Cancelled','Return Request','Returning'],
        default: 'Pending',
    },
    message:{
        type:String,
        required:false
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});


orderSchema.pre('save', function (next) {
    if (!this.orderId) {
        this.orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;