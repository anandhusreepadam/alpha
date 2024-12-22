const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionSchema = new mongoose.Schema({
    order:{
        type:Schema.Types.ObjectId,
        ref:'Order'
    },
    orderId:{
        type:String,
        default:null,
    },
    type: {
        type: String,
        enum: ['debit','credit','refund'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    description:{
        type:String
    }
});

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default:0,
    },
    transactions: [transactionSchema]
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet; 