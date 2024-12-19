const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wallet = require('../../models/walletSchema');


const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        if (!req.session.user) {
            return res.status(400).json({ redirect: '/login', message: 'Please Login First' })
        }
        const userId = req.session.user._id;
        let cart = await Cart.findOne({ userId })
        const product = await Product.findOne({ _id: productId });
        if (!product) {
            return res.status(400).json({ success: false, message: 'Product Not Found' });
        }
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (existingItem) {
            if (existingItem.quantity + quantity > 5) {
                return res.status(400).json({ success: false, message: 'Item limit Exceeded. You can only choose upto 5 quantity' })
            } else if (product.quantity < existingItem.quantity + quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.productName}.`
                });
            }
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                productId: product._id,
                name: product.productName,
                price: product.salePrice,
                quantity
            });
        }
        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Failed to Add to cart' })
    }
}

const loadCart = async (req, res) => {
    try {
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        let cartTotal = 0;
        let cartItems = [];
        let messages = [];
        if (cart && cart.items.length > 0) {
            cartItems = cart.items.map((item) => {
                const product = item.productId;
                if (!product || product.isDeleted || product.isBlocked) {
                    messages.push(`Product "${item.productName || 'Unknown'}" is no longer available.`);
                    return null;
                }
                if (item.quantity > product.quantity) {
                    if (product.quantity == 0) {
                        messages.push(`Oops! ${product.productName} is currently out of stock`)
                    } else {
                        messages.push(
                            `Oops! We currently have only ${product.quantity} unit of '${product.productName}' available, but you requested ${item.quantity}. Please adjust the quantity in your cart or explore other options.`
                        );
                    }
                    item.quantity = product.quantity;
                }
                cartTotal += product.salePrice * item.quantity;
                return item;
            });
            cartItems = cartItems.filter((item) => item !== null);
            await cart.save();
        }
        res.render('cart', {
            user,
            title: 'Cart',
            cart: { items: cartItems },
            cartTotal,
            messages,
        });
    } catch (error) {
        console.error('Failed to load Cart:', error);
        res.redirect('/pageError');
    }
};

const updateCart = async (req, res) => {
    const user = req.session.user;
    const { id, quantity } = req.body;
    try {
        const cart = await Cart.findOne({ userId: user._id }).populate('items.productId');
        const cartItem = cart.items.find(item => item.productId._id.toString() === id);

        if (cartItem) {
            if (quantity > 5) {
                return res.status(400).json({ message: 'Item limit Exceeded. You can only choose upto 5 quantity' })
            }

            if (cartItem.productId.quantity < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${cartItem.name}.`
                });
            }

            cartItem.quantity = quantity;

            await cart.save();

            const updatedPrice = (cartItem.productId.salePrice * cartItem.quantity).toFixed(2);

            const cartTotal = cart.items.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0).toFixed(2);

            return res.status(200).json({ updatedPrice, cartTotal });
        } else {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const checkStock = async (req, res) => {
    const { cartItems } = req.body;
    const stockIssues = [];
    console.log(cartItems)
    for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (product.stock < item.quantity) {
            stockIssues.push({
                productId: item.productId,
                productName: product.productName,
                availableStock: product.stock,
            });
        }
    }
    if (stockIssues.length > 0) {
        return res.status(400).json({ success: false, stockIssues });
    }
    res.status(200).json({ success: true });
};

const deleteCart = async (req, res) => {
    const user = req.session.user;
    const { id } = req.body;
    try {
        const cart = await Cart.findOne({ userId: user._id });
        if (cart) {
            cart.items = cart.items.filter(item => item.productId.toString() != id);
            await cart.save();
            res.status(200).json({ success: true })
        } else {

            res.status(400).json({ success: false })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to remove item from cart" });
    }
}



module.exports = {
    loadCart,
    addToCart,
    deleteCart,
    updateCart,
    checkStock
}