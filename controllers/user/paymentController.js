const Razorpay = require('razorpay');
const crypto = require('crypto');


const createOrder =  async(req, res)=> {
        try {
            // Initialize Razorpay instance
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            // Create Razorpay order
            const amount = req.body.amount; // Amount in rupees from the client
            const currency = 'INR';

            const options = {
                amount: amount * 100, // Convert to paise
                currency,
                receipt: `receipt_${Date.now()}`, // Unique receipt ID
            };

            const order = await razorpay.orders.create(options);

            res.status(200).json({
                success: true,
                razorpayOrderId: order.id,
                amount: order.amount,
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
        createOrder,
        verifyPayment
    }