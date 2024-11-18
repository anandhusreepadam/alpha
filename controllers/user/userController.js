
const loadSignup = async (req,res)=>{
    try {
        return res.render('signup')
    } catch (error) {
console.log('Home page not loading:',error);
res.status(500).send('Server Error');       
    }
}

const loadShopping = async(req,res)=>{
    try {
        return res.render('shop');
    } catch (error) {
        console.log('Shopping page not loading:',error);
        res.status(500).send('Server Error');
    }
}
const pageNotFound = async(req,res)=>{
    try {
        res.render('page-404')
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}





const loadHomepage = async(req,res)=>{
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
    loadShopping
};