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

const updateCart = async(req,res) =>{
    const user = req.session.user;
    const {id,quantity} = req.body;
    try {
        const cart = await Cart.findOne({userId:user._id});
        const cartItem = cart.items.find(item => item.productId.toString() === id);

        if (cartItem) {
            if(quantity>5){
                return res.status(400).json({error:'Item limit Exceeded. You can only choose upto 5 quantity'})
            }
           
            cartItem.quantity = quantity;

            await cart.save();

            const updatedPrice = (cartItem.productId.salePrice * cartItem.quantity).toFixed(2);

            const cartTotal = cart.items.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0).toFixed(2);

            return res.status(200).json({ updatedPrice, cartTotal });
        } else {
            return res.status(404).json({ error: 'Item not found in cart' });
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        if(!req.session.user){
            return  res.status(400).json({redirect:'/login',message:'Please Login First'})
        }
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
            if(existingItem.quantity+quantity>5){
                return res.status(400).json({success:false,message:'Item limit Exceeded. You can only choose upto 5 quantity'})
            }
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
    const user = req.session.user;
    const {id} = req.body;
    try {
        const cart = await Cart.findOne({userId:user._id});
        if(cart){
            cart.items = cart.items.filter(item => item.productId.toString()!=id);
            await cart.save();
             res.status(200).json({success:true})
        }else{

            res.status(400).json({success:false})
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:"Failed to remove item from cart"});
    }
}



module.exports = {
    loadCart,
    addToCart,
    deleteCart,
    updateCart
}