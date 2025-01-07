const Coupon = require('../../models/couponSchema');



const loadCoupons = async(req,res)=>{
    try {
        const coupons = await Coupon.find({});
        res.render('coupons',{coupons})
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

const createCoupon = async (req,res)=>{
    try {
        const {code,discountType,discountValue,minOrderValue,expiryDate,usageLimit} = req.body;
        const newCoupon = new Coupon ({
            code,
            discountType,
            discountValue,
            minOrderValue,
            expiryDate,
            usageLimit
        })
        await newCoupon.save();    
        res.status(200).json({ message: 'Coupon created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
}

const deleteCoupon = async(req,res)=>{
    try {
        const {id} = req.params;
        await Coupon.findOneAndDelete({_id:id});
        res.status(200).json({message:'Coupon deleted Successfully'})
    } catch (error) {
        console.error(error);
        res.status(500).json({message:'Server error'})
    }
}





module.exports = {
    loadCoupons,
    createCoupon,
    deleteCoupon
}