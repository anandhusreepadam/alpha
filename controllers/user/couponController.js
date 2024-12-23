const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');




const applyCoupon = async (req, res) => {
    const { couponCode, userId, orderTotal } = req.body;
    try {
        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }

        if (new Date() > coupon.expiryDate) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }

        if (orderTotal < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Order total must be at least ₹${coupon.minOrderValue} to use this coupon`,
            });
        }

        const user = await User.findById(userId);
        if (user.usedCoupons.includes(coupon._id)) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon' });
        }

        const discount =
            coupon.discountType === 'percentage'
                ? (orderTotal * coupon.discountValue) / 100
                : coupon.discountValue;

        res.status(200).json({ success: true, discount });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}



module.exports = {
    applyCoupon,

}