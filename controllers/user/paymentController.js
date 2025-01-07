const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../../models/orderSchema');

const razorpay = require('../../config/razorpay');

const retryPayment =  async(req, res)=> {
    const {orderId} = req.query;
    const user = req.session.user;
        try {
            const order = await Order.findOne({_id:orderId});
            const razorpayOrder = await razorpay.orders.create({
                currency: 'INR',
                receipt: `${user._id}_${Date.now()}`,
                amount: order.finalAmount * 100,
            })
            order.razorpayOrderId = razorpayOrder.id;
            await order.save();
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
    }

  const verifyPayment = async (req, res) =>{
        try {
            const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body)
                .digest('hex');

            if (expectedSignature === razorpay_signature) {
                await Order.findOneAndUpdate({razorpayOrderId:razorpay_order_id},{paymentStatus:'Paid'});
                res.status(200).json({ success: true, message: 'Payment verified successfully.' });
            } else {
                res.status(400).json({ success: false, message: 'Payment verification failed.' });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).json({ success: false, message: 'Verification failed.' });
        }
    }




    module.exports ={
        retryPayment,
        verifyPayment
    }