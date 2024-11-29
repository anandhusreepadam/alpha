const User = require('../../models/userSchema');
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');

async function getUser(req) {
    try {
        const userSession = req.session.user;
        return userSession ? await User.findById(userSession._id) : null;

    } catch (error) {
        console.log(error)
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
            subject: "Your One Time Password for Resetting Chanel One Account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`
        })
        return info.accepted.length > 0

    } catch (error) {
        console.log("Error sending Email", error)
        return false;
    }
}

const loadConfirmPassword = async (req, res) => {
    try {
        const user = await getUser(req);
        res.render('confirmPassword', { title: "Update Email", user: user });
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const confirmPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const user = await getUser(req);
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            res.render('confirmPassword', { message: "Wrong Password. Please Try again!", title: "Verify Password", user: user })
        } else {
            res.redirect('/newEmail')
        }
    } catch (error) {
        console.log(error)
        res.redirect('/pageNotFound')
    }
}

const newEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            req.session.userOtp = otp;
            req.session.userData = req.body;
            req.session.email = email;
            const user = getUser(req);
            res.render('verifyChangePassword', { title: "Verify OTP", user: user });
            console.log("OTP:", otp);

        } else {
            res.json("email Error")
        }
    }
    catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyChangeOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        const otp = req.session.userOtp
        const user = req.session.user
        if (enteredOtp == otp) {
            await User.updateOne({_id:user._id},{$set:{email:req.session.email}})
            res.redirect('/profile')
        } else {
            res.render('verifyChangeOtp', { message: "Invalid OTP", user: req.session.userData });
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadChangePassword = async (req, res) => {
    try {
        res.render('changePassword');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}


const loadNewEmail = async (req, res) => {
    try {
        const user = await getUser(req);
        res.render('newEmail', { user, title: "New Email" })
    } catch (error) {

    }
}


module.exports = {
    // changeEmail,
    verifyChangeOtp,
    loadChangePassword,
    confirmPassword,
    loadNewEmail,
    loadConfirmPassword,
    newEmail
}