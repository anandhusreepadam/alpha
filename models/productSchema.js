const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
    productName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: false,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    normalPrice: {
        type: Number,
        required: true,
    },
    salePrice: {
        type: Number,
    },
    productOffer: {
        type: Number,
        default: 0,
    },
    categoryOffer: {
        type: Number,
        default: 0,
    },
    quantity: {
        type: Number,
        default: true
    },
    color: {
        type: String,
        required: true
    },
    productImage: {
        type: [String],
        required: true,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "out of stock", "discontinued"],
        required: true,
        default: "Available"
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


productSchema.pre('save', function (next) {
    if (this.productOffer > 0 || this.categoryOffer > 0) {
        if (this.productOffer > this.categoryOffer) {
            this.salePrice = this.normalPrice - Math.floor((this.normalPrice * this.productOffer) / 100);
        } else {
            this.salePrice = this.normalPrice - Math.floor((this.normalPrice * this.categoryOffer) / 100);
        }
    }
    else {
        this.salePrice = this.normalPrice;
    }
    next();
});



const Product = mongoose.model("Product", productSchema);

module.exports = Product;
