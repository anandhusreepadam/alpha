const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');




const loadWishlist = async (req, res) => {
    try {
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        const cart = user ? await Cart.findOne({ userId: user._id }) : { items: [] };
        const wishlist = await Wishlist.findOne({ userId: user._id }).populate('items.productId');
        let wishlistItems = [];
        let messages = [];
        if (wishlist && wishlist.items.length > 0) {
            wishlistItems = wishlist.items.map((item) => {
                const product = item.productId;
                if (!product || product.isDeleted || product.isBlocked) {
                    messages.push(`Product "${product?.productName || 'Unknown'}" is no longer available.`);
                    return null;
                };
                if (product.quantity == 0) {
                    messages.push(`Oops! ${product.productName} is currently out of stock`);
                    return null;
                };
                return {
                    id: product._id,
                    name: product.productName,
                    price: product.salePrice,
                    image: product.productImage,
                    stock: product.quantity,
                };
            });
        };
        console.log(wishlistItems)
        res.render('wishlist', {
            user,
            title: 'Wishlist',
            cart: cart,
            wishlist: { items: wishlistItems },
            messages
        });
    } catch (error) {
        console.log('Failed to load Wishlist', error)
    }
};


const addToWishlist = async(req,res)=>{
    const {productId} = req.body;
    try {
        if (!req.session.user) {
            return res.status(400).json({ redirect: '/login', message: 'Please Login First' })
        }
        const userId = req.session.user._id;
        let wishlist = await Wishlist.findOne({userId})
        if(!wishlist){
            wishlist = new Wishlist({
               userId,
               items:[]
           })
       }

        const product = await Product.findOne({_id:productId})
        if (!product) {
            return res.status(400).json({ success: false, message: 'Product Not Found' });
        }
     
        const existingItem = wishlist.items.find(item=>item.productId.toString()==productId);
        if(existingItem){
            return res.status(400).json({
                success:false,
                message:"Product already in wishlist"
            })
        }else{
            wishlist.items.unshift({
                productId,
            })
        }
        await wishlist.save();

        res.status(200).json({
            success:true,
            message:'Product Added to wishlist successfully'
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
module.exports = {
    loadWishlist,
    addToWishlist
}