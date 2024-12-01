const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');


//functions
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
            res.render('newEmail', { message: "Invalid OTP", user: req.session.userData,title:"Update Email" });
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadNewEmail = async (req, res) => {
    try {
        const user = await getUser(req);
        res.render('newEmail', { user, title: "New Email" })
    } catch (error) {

    }
}

const loadChangePassword = async (req, res) => {
    try {
        const user = await getUser(req);
        res.render('changePassword',{user,title:"Update Password"});
    } catch (error) {
        res.redirect('/pageNotFound');
    }
}

const changePassword = async(req,res)=>{
    try {
        const user = await getUser(req);
        const {currentPassword,newPassword} = req.body;
        const passwordMatch = await bcrypt.compare(currentPassword,user.password);
        console.log(currentPassword)
        if(passwordMatch){
            if(currentPassword==newPassword){
                return res.render('changePassword',{message:"New password cannot be the same as the current password.",user,title:"Update Password"});
            }
            const passwordHash = await securePassword(newPassword);
            await User.updateOne({_id:user._id},{$set:{password:passwordHash}});
            console.log('password updated Successfully');
            return res.redirect('/profile');
        }else{
            return res.render('changePassword',{message:"Wrong Password",user,title:"Update Password"});
        }
        
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotfound');
    }
}

const loadAddress = async (req,res)=>{
    try {
        const user = await getUser(req);
        const addressData = await Address.findOne({userId:user._id})
        const addresses = addressData ? addressData.address : [];
        res.render('address',{title:"Address",user,addressData:addresses});
    } catch (error) {
        console.log(error);
        res.redirect('/pageNotFound');
    }
}

const addAddress = async(req,res)=>{
    try {
        const user = await getUser(req);
        const {name,fullAddress,city,state,phone,pincode,addressType}=req.body;
        const userAddress = await Address.findOne({userId:user._id})
        if(!userAddress){

            const newAddress = new Address({
                userId:user._id,
                address:[{name,fullAddress,city,state,phone,pincode,addressType}]
            });
            await newAddress.save();
        }else{
            userAddress.address.push({name,fullAddress,city,state,phone,pincode,addressType});
            await userAddress.save();
        }
        res.status(200).json('Address Saved Successfully');

    } catch (error) {
        console.log(error);
        res.status(500).json('Error while saving Address')
    }
}


module.exports = {
    verifyChangeOtp,
    loadNewEmail,
    newEmail,
    loadConfirmPassword,
    confirmPassword,
    loadChangePassword,
    changePassword,
    loadAddress,
    addAddress
}