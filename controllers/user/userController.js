const User = require('../../models/userSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config();

const loadSignup = async (req, res) => {
    try {
        return res.render('signup')
    } catch (error) {
        console.log('Home page not loading:', error);
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
        const { email, password } = req.body;
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
        req.session.userData = { email, password };

        // res.render('verify-otp')
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



module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    loadShopping,
    signup
};