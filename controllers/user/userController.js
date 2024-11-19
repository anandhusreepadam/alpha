const User = require('../../models/userSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config();
const bcrypt = require('bcrypt')



const loadSignup = async (req, res) => {
    try {
        return res.render('signup')
    } catch (error) {
        console.log('Home page not loading:', error);
        res.status(500).send('Server Error');
    }
}

const loadVerifyOtp = async (req, res) => {
    try {
        return res.render('verify-otp')
    } catch (error) {
        console.log('Verify page not loading:', error);
        res.status(500).send('Server Error');
    }
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })
        return info.accepted.length > 0


    } catch (error) {
        console.log("Error sending Email", error)
        return false;
    }
}

const signup = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        console.log(req.body)
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
        req.session.userData = { name,phone,email, password };

        res.render('verify-otp')
        console.log("OTP Sent", otp)
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/pageNotFound");
    }
}

const loadShopping = async (req, res) => {
    try {
        return res.render('shop');
    } catch (error) {
        console.log('Shopping page not loading:', error);
        res.status(500).send('Server Error');
    }
}

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadHomepage = async (req, res) => {
    try {
        return res.render('home');
    } catch (error) {
        console.log('Home Page not found');
        res.status(500).send('Server Error');
    }
}

const securePassword =async(password)=>{
    try {
        const paswordHash = await bcrypt.hash(password,10)

        return passwordHash;
    } catch (error) {
        
    }
}

const verifyOtp = async (req,res)=>{
    try {
        const {otp} = req.body;
        if(otp==req.session.userOtp){
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true,redirectUrl:'/'})
        }else{
            res.status(400).json({success:false,message:'Invalid OTP, Please try again'})
        }
    } catch (error) {
        console.log("Error Verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadShopping,
    signup,
    loadVerifyOtp,
    verifyOtp
};