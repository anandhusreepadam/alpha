const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const Category = require('../../models/categorySchema');

const nodemailer = require('nodemailer');
const { response } = require('express');
const bcrypt = require('bcrypt');


////Functions 
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your One Time Password for Resetting Chanel One Account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })
        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending Email", error)
        return false;
    }
};

async function securePassword(password) {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {
        console.error('Error hashing password', error);
        throw new Error('Failed to secure password');
    }
};

async function getAllProducts() {
    try {
        const response = await Product.find({ isDeleted: false, isBlocked: false })
        return response;
    } catch (error) {
        console.error(error.message)
    }
};


////Routes
const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            const msg = req.session.msg;
            req.session.msg = null;
            return res.render('login', { message: msg })
        } else {
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: false, email: email });

        if (!findUser) {
            return res.render('login', { message: 'User not found' });
        } if (findUser.isBlocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password)

        if (!passwordMatch) {
            return res.render('login', { message: 'Incorrect Password' });
        }
        req.session.user = { _id: findUser._id, name: findUser.name };
        res.redirect('/')
    } catch (error) {
        console.error('login error', error);
        res.render('login', { message: 'Login failed please try again' })
    }
};

const loadSignup = async (req, res) => {
    try {
        return res.render('signup')
    } catch (error) {
        console.error('Home page not loading:', error);
        res.status(500).send('Server Error');
    }
};

const signup = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render('signup', { message: 'User with this email already exists' });
        }
        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.json('email-error')
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        res.render('verify-otp')
        console.log("OTP Sent", otp)
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (otp == req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash
            })
            await saveUserData.save();
            req.session.user = { _id: saveUserData._id, name: saveUserData.name };
            res.json({ success: true, redirectUrl: '/login' })
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP, Please try again' })
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occured" })
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email not found in session' });
        }
        const otp = generateOtp();
        req.session.userOtp = otp;
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log('Resend OTP', otp);
            res.status(200).json({ success: true, message: 'OTP resend sucessfullly' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to resend OTP' });
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ success: false, message: 'Internal server error. Please try again' });
    }
};

const loadForgotPassword = async (req, res) => {
    try {
        res.render('forgotPassword');
    } catch (error) {
        res.redirect('/pageNotFound')
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render('verifyForgotPassword');
                console.log("OTP:", otp)

            } else {
                response.json({ success: false, message: "Failed to Send OTP. Please try again" })
            }
        } else {
            res.render('forgotPassword', { message: " User does not exist" })
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
};

const verifyForgotOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (otp == req.session.userOtp) {
            res.json({ success: true, redirectUrl: '/resetPassword' })
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP, Please try again' })
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occured" })
    }
};

const loadResetPassword = async (req, res) => {
    try {
        res.render('resetPassword')
    } catch (error) {

    }
};

const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const email = req.session.email;
        if (newPassword == confirmPassword) {
            const passwordHash = await securePassword(newPassword);
            await User.updateOne({ email: email }, { $set: { password: passwordHash } })
            req.session.msg = "Password Changed successfully"
            res.redirect('/login');
        } else {
            res.render('resetPassword', { message: "Password Does not match" });
        }
    } catch (error) {
        console.error("An error occured", error)
        res.redirect('/pageNotFound')
    }
};

const loadHomepage = async (req, res) => {
    try {
        req.session.user = req.user?req.user:req.session.user;
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        const cart = user ? await Cart.findOne({ userId: user._id }) : null;
        const allProducts = await getAllProducts()
        allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        res.render('home', { user, allProducts, title: "Chanel One", cart: cart || { items: [] } });
    } catch (error) {
        console.error('Home Page not found');
        res.status(500).send('Server Error');
    }
};

const loadShopping = async (req, res) => {
    try {
        const search  = req.query.search || '';
        const escapedSearch = search.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");
        const page = req.query.page || 1;
        const limit = 8;
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        const cart =user? await Cart.findOne({ userId: user._id }):null;
        const category = await Category.find({ isDeleted: false, isListed: true })
        const allProducts = await Product.find({
            isBlocked: false,
            isDeleted: false,
            quantity: { $gt: 0 },
            productName: { $regex: new RegExp('.*' + escapedSearch + '.*', 'i') }
        })  .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();

        const count = await Product.find({isBlocked:false,isDeleted:false,
             productName: { $regex: new RegExp('.*' + escapedSearch + '.*', 'i') } 
        }).countDocuments();

        const totalPages = Math.ceil(count/limit)
        return res.render('shop', { user, allProducts,category, title: "Shop", cart: cart||{ items: [] },currentPage: page,
            totalPages: totalPages,search:search});
    } catch (error) {
        console.error('Shopping page not loading:', error);
        res.status(500).send('Server Error');
    }
};

const loadProducts = async(req,res)=>{
    try {
        const {
            search = '',
            category,
            minPrice,
            maxPrice,
            brand,
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 8,
        } = req.query;
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const query = {
            isBlocked: false,
            isDeleted: false,
            quantity: { $gt: 0 },
            ...(search ? { productName: { $regex: new RegExp(`.*${escapedSearch}.*`, 'i') } } : {}),
            ...(category && category !== 'undefined'? { category: category } : {}),
            ...(minPrice || maxPrice
                ? {
                      salePrice: {
                          ...(minPrice ? { $gte: Number(minPrice) } : {}),
                          ...(maxPrice ? { $lte: Number(maxPrice) } : {}),
                      },
                  }
                : {}),
            ...(brand ? { brand: brand } : {}),
        };
        
        const sortOptions = { [sortBy]: order === 'asc' ? 1 : -1 };
        const allProducts = await Product.find(query)
            .sort(sortOptions)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .populate('category')

        const totalProducts = await Product.countDocuments(query);

        res.json({
            products: allProducts,
            currentPage: Number(page),
            totalPages: Math.ceil(totalProducts / Number(limit)),
            totalProducts,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error });
    }
    
}

const loadProductPage = async (req, res) => {
    try {
        const user = req.session.user;
        const id = req.params.id;
        const product = await Product.findById(id)
        const cart = user? await Cart.findOne({ userId: user._id }):null;
        return res.render('product', { user, product, title: null, cart: cart || { items: [] } })
    } catch (error) {

    }
};

const loadProfile = async (req, res) => {
    try {
        const userSession = req.session.user;
        const user = userSession ? await User.findById(userSession._id) : null;
        const cart = user ? await Cart.findOne({ userId: user._id }).populate('items.productId') : null ;
        res.render('profile', { user, title: "Profile",cart:cart||{items:[]},currentPage: 'profile'})
    } catch (error) {
        console.error('Failed to Load Profile', error)
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error', err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect('/login');
        })
    } catch (error) {
        console.error('Logout Error'.error);
        res.redirect('/pageNotFound');
    }
};

const pageNotFound = async (req, res) => {
    try {
        const user = req.session.user;
        const cart = user ? await Cart.findOne({ userId: user._id }) : null;
        res.render('page-404', { user, title: "404", cart: cart || { items: [] }});
    } catch (error) {
        console.error(error);
        res.redirect('/pageNotFound');
    }
};

const errors = async(req,res) =>{
    try {
        res.render('errors')
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadShopping,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadProductPage,
    loadProfile,
    loadForgotPassword,
    forgotPassword,
    verifyForgotOtp,
    loadResetPassword,
    resetPassword,
    loadProducts,
    errors
};