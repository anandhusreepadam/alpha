const User = require('../../models/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');



const pageError= async(req,res)=>{
    try {
        return res.render('admin-error')
    } catch (error) {
        
    }
}

const loadLogin = (req,res)=>{
    const msg = req.session.pass;
    req.session.pass=null;
    if(req.session.admin){
        return res.redirect('/admin');
    }
    res.render('admin-login',{message:msg});
}

const login = async (req,res)=>{
    try {
        const{email,password}=req.body;
        const admin= await User.findOne({email,isAdmin:true});
        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin=true;
                return res.redirect('/admin');
            }else{
                req.session.pass= "Wrong Password";
                return res.redirect('/admin/login')
            }
        }else{
            req.session.pass="Invalid Admin Credential"
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log('login error',error);
        return res.redirect('/pageError')
    }
}

const loadDashboard = async(req,res)=>{
    if (req.session.admin) {
        try {
            res.render('dashBoard');

        } catch (error) {
            res.redirect('/pageerror')
        }
    }
}

const logout= async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log('Error destroying session',err);
                return res.redirect('/pageError')
            }
            res.redirect('/admin/login')
        });
    } catch (error) {
     console.log("Unexpected error during logout",error)
     res.redirect('/pageError')   
    }
}




module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout

}