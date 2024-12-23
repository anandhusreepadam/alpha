const Wallet = require('../../models/walletSchema');
const Cart = require('../../models/cartSchema');


const loadWallet = async (req, res) => {
    const user = req.session.user;
    const cart = user ? await Cart.findOne({ userId: user._id }) : { items: [] };
    const wallet = await Wallet.findOne({ userId: user._id });
    try {
        if (!wallet) {
            const newWallet = new Wallet({
                userId: user._id,
                balance: 0,
                transactions: [],
            });
            await newWallet.save();
            return res.render('wallet', {
                title: 'Wallet',
                currentPage: 'wallet',
                user,
                cart,
                wallet:newWallet,
            });
        }
        res.render('wallet', {
            title: 'Wallet',
            currentPage: 'wallet',
            user,
            cart,
            wallet,
        });
    } catch (error) {
        console.log(error);
        res.redirect('/pageError')
    }
}

const addToWallet = async (req, res) => {
    try {
        const user = req.session.user;
        const { amount } = req.body;
        const wallet = await Wallet.findOneAndUpdate({ userId: user._id }, { $inc: { balance: amount } });
        if (!wallet) {
            return res.status(400).json({ success: false });
        }
        wallet.transactions.unshift({
            type: 'credit',
            amount,
            description: 'Money added to Wallet',
            date: new Date(),
        });
        await wallet.save();
        res.status(200).json({ success: true, message: 'Money added successfully' });
    } catch (error) {
        console.log(error)

    }
}

module.exports = {
    loadWallet,
    addToWallet
}