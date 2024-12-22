const mongoose = require('mongoose');
const {Schema} = mongoose;


const couponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true 
    },    
    discountType: { 
        type: String, 
        enum: ['percentage', 'flat'], 
        required: true 
    },
    discountValue: { 
        type: Number, 
        required: true 
    },
    minOrderValue: { 
        type: Number, 
        default: 0 
    },
    expiryDate: { 
        type: Date, 
        required: true 
    },
    usageLimit: { 
        type: Number, 
        default: 1 
    },
    usageCount: { 
        type: Number, 
        default: 0 
    },
  },{timestamps:true});

const Coupon = mongoose.model('Coupon',couponSchema);
module.exports = Coupon;