const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');

const bcrypt = require('bcrypt');


//functions
async function getUser(req) {
    try {
        const userSession = req.session.user;
        return userSession ? await User.findById(userSession._id) : null;

    } catch (error) {
        console.error(error)
    }
}

async function securePassword(password) {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {
        console.error('Error hashing password', error);
        throw new Error('Failed to secure password');
    }
}


//routes
const loadNewEmail = async (req, res) => {
    try {
        const user = await getUser(req);
        const cart = user ? await Cart.findOne({ userId: user._id }).populate('items.productId') : null;
        res.render('newEmail', { user, title: "New Email",cart:cart||{items:[]} })
    } catch (error) {

    }
}

const loadChangePassword = async (req, res) => {
    try {
        const user = await getUser(req);
        const cart = user ? await Cart.findOne({ userId: user._id }).populate('items.productId') : null;
        res.render('changePassword', { user, title: "Update Password" ,cart:cart||{items:[]}});
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const changePassword = async (req, res) => {
    try {
        const user = await getUser(req);
        const { currentPassword, newPassword } = req.body;
 
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        const cart = user ? await Cart.findOne({ userId: user._id }) : null;
        if (passwordMatch) {
            if (currentPassword == newPassword) {
                return res.status(400).json({ message: "New password cannot be the same as the current password."});
            }
            const passwordHash = await securePassword(newPassword);
            await User.updateOne({ _id: user._id }, { $set: { password: passwordHash } });
            return res.status(200).json({redirect:'/profile'});
        } else {
            return res.status(400).json({ message: "Wrong Password"});
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({message:'server error',redirect:'/pageNotfound'});
    }
}

const loadAddress = async (req, res) => {
    try {
        const user = await getUser(req);
        const addressData = await Address.findOne({ userId: user._id })
        const addresses = addressData ? addressData.address : [];
        const cart = user ? await Cart.findOne({ userId: user._id }) : null;
        res.render('address', { title: "Address", user, addressData: addresses ,cart:cart||{items:[]},currentPage: 'address'});
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const saveUserData = async(req,res)=>{
    try {
        const user = req.session.user;
        const data = req.body;
        if(!user){
            return res.status(400).json('Error User not found');
        }
        await User.updateOne({_id:user._id},{
            name:data.name,
            phone:data.phone,
            lastName:data.lastName
        })
        res.status(200).json('success')
    } catch (error) {
        res.status(500).json('Error occured')
    }
}

const addAddress = async (req, res) => {
    try {
        const user = await getUser(req);
        const { name, fullAddress, city, state, phone, pincode, addressType } = req.body;
        const userAddress = await Address.findOne({ userId: user._id })
        if (!userAddress) {

            const newAddress = new Address({
                userId: user._id,
                address: [{ name, fullAddress, city, state, phone, pincode, addressType }]
            });
            await newAddress.save();
        } else {
            userAddress.address.push({ name, fullAddress, city, state, phone, pincode, addressType });
            await userAddress.save();
        }
        res.status(200).json('Address Saved Successfully');

    } catch (error) {
        console.error(error);
        res.status(500).json('Error while saving Address')
    }
}

const loadEditAddress = async (req, res) => {
    try {
        const addressId = req.query.id;
        const user = req.session.user;
        const cart = user ? await Cart.findOne({ userId: user._id }) : null;
        const currAddress = await Address.findOne({
            'address._id': addressId,
        });

        if (!currAddress) {
            return res.redirect('/pageNotFound');
        }
        const addressData = currAddress.address.find((item) => {
            return item._id.toString() == addressId.toString();
        })

        if (!addressData) {
            return res.redirect('/pageNotFound')
        }
        res.render('editAddress', { address: addressData, user, title: 'Edit Address',cart:cart||{items:[]},currentPage: 'address'});

    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
}

const editAddress = async (req, res) => {

    try {
        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;
        const findAddress = await Address.findOne({ 'address._id': addressId });
        if (!findAddress) {
            res.status(400).json({ redirect: '/pageNotFound' })
        }
        await Address.updateOne(
            { 'address._id': addressId },
            {
                $set: {
                    'address.$': {
                        _id: addressId,
                        addressType: data.addressType,
                        name: data.name,
                        city: data.city,
                        fullAddress: data.fullAddress,
                        state: data.state,
                        pincode: data.pincode,
                        phone: data.phone,
                    }
                }
            })
        res.status(200).json({ redirect: '/address' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ redirect: '/pageNotFound' });
    }

}

const deleteAddress = async (req,res) =>{
    try {
        const addressId = req.query.id;
        const findAddress = await Address.findOne({'address._id':addressId});
        if(!findAddress){
            return res.status(400).json('Address not Found');
        }
        await Address.updateOne({'address._id':addressId},
            {$pull:{
                address:{
                    _id:addressId
                }
            }}
        )
        res.status(200).json("Address Deleted Successfully");
    } catch (error) {
        console.error(error);
        res.status(500).json({redirect:'/pageNotFound'});
    }
}


module.exports = {
    loadNewEmail,
    loadChangePassword,
    changePassword,
    loadAddress,
    saveUserData,
    addAddress,
    loadEditAddress,
    editAddress,
    deleteAddress
}