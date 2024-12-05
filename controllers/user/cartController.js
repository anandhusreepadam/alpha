const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');


const loadCart = async (req, res) => {
    try {
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        const cart = await Cart.findOne({userId:user._id}).populate('items.productId');
        const cartTotal = cart? cart.items.reduce((acc, item) => {
            return acc + item.productId.salePrice * item.quantity;
          }, 0):0;
        res.render('cart', { user, title: 'Cart',cart: cart || { items: [] },cartTotal})
    } catch (error) {
        console.log('Failed to load Cart', error)
    }
}

const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    try {
     
        const userId =  req.session.user._id;
        let cart = await Cart.findOne({ userId })
        const product = await Product.findOne({ _id:productId });
        if (!product) {
            return res.status(400).json({ success: false, message: 'Product Not Found' });
        }
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (existingItem){
            existingItem.quantity+=quantity;
        }else{
            cart.items.push({
                productId:product._id,
                name:product.productName,
                price:product.salePrice,
                quantity
            }); 
        }
        await cart.save();
        res.json({success:true,cart});
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:'Failed to Add to cart'})
    }
}

const deleteCart = async (req,res) =>{
    const {userId,productId} = req.params;
    try {
        const cart = await Cart.findOne({userId});
        if(cart){
            cart.items = cart.items.filter(item => item.productId.toString()!=productId);
            await cart.save();
        }
        res.json({success:true,cart});
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:"Failed to remove item from cart"});
    }
}



module.exports = {
    loadCart,
    addToCart,
    deleteCart
}