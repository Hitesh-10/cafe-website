require("dotenv").config()
const express = require('express')
const app = express()
const path = require('path')
const logger = require('morgan')
const mongoose = require('mongoose')
var bodyParser = require('body-parser');
const fs = require('fs');
const multer = require('multer')
const session = require('express-session')

const User = require('./models/user')
const Admin = require('./models/admin')
const Item = require('./models/item')
const Cart = require('./models/cart')


app.use(express.static(path.join(__dirname, 'public')))
app.use(logger('dev'))
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }))

//SESSION
app.use(session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
}))

//EJS
app.set('view-engine', 'ejs')

//MONGODB connection
mongoose.connect(process.env.MONGO_URL, {
}).then(() => console.log("MONGODB connected"))
  .catch(error => console.log(error))

//Storage
const Storage = multer.diskStorage({
    destination: "./public/uploads",
    filename: (req, file, cb) => {

        cb(null, file.fieldname+"_"+Date.now()+path.extname(file.originalname))
    }
})

const upload = multer({
    storage: Storage
}).single('file')


//Main Page GET
app.get("/", async (req,res) => {
    await Item.find().then(item => {
        res.render("main.ejs", {
            items: item
        })
    })
})

//Signup GET
app.get("/signup", (req,res) => {
    res.render("signup.ejs")
})

//Admin Signup GET
app.get("/admin-signup", (req,res) => {
    res.render("adminSignup.ejs")
})

//Signup POST
app.post("/signup", async(req,res) => {
    try {
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        })
        await user.save()
        console.log("User Created")
        res.redirect("/login")
    } catch {
        res.redirect("/signup")
    }
})

//Admin Signup POST
app.post("/admin-signup", async(req,res) => {
    try {
        const admin = new Admin({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        })
        await admin.save()
        console.log("User Created")
        res.redirect("/admin-login")
    } catch {
        res.redirect("/signup")
    }
})

//Login GET
app.get("/login", (req, res) => {
    res.render("login.ejs")
})

//Admin Login GET
app.get("/admin-login", (req, res) => {
    res.render("adminLogin.ejs")
})

//Login POST
app.post("/signin", async (req, res) => {
    await User.find({ email: req.body.email }).then(data => {
        if(req.body.password == data[0].password){
            req.session.user = data[0]
            res.redirect("/custPanel")
        } else {
            res.redirect("/login")
        }
    }).catch(error => {
        console.log(error)
        // res.send("Error")
        res.redirect("/signup")
    })
})

//Admin Login POST
app.post("/admin-signin", async (req, res) => {
    await Admin.find({ email: req.body.email }).then(data => {
        console.log(data)
        if(req.body.password == data[0].password){
            req.session.user = data[0]
            res.redirect("/adPanel")
        } else {
            res.redirect("/admin-login")
        }
    }).catch(error => {
        console.log(error)
        res.redirect("/signup")
    })
})

//Admin Panel GET
app.get("/adPanel", checkAuth, async (req, res) => {
    await Item.find({ adminId: req.session.user._id }).then(item => {
        res.render("adPanel.ejs", {
            items: item
        })
    })
})

//CustPanel GET
app.get("/custPanel", checkAuth, async (req, res) => {
    await Item.find({ adminId: req.session.user._id }).then(item => {
        res.render("custPanel.ejs", {
            items: item
        })
    })
})

//ADD Item
app.post("/additem", upload, async (req, res) => {
    try {
        const item = new Item({
            name: req.body.name,
            price: req.body.price,
            image: req.file.filename
        })
        await item.save()
        console.log("Item Added")
        res.redirect("/adPanel")
    } catch(err) {
        console.log(err)
        res.send(err)
    }
})

//Edit Item GET
app.get("/edititem/:id", checkAuth, async (req, res) => {
    await Item.findById(req.params.id).then(item => {
            res.render("editItem.ejs", {
                item: item
            })
    }).catch(e => {
        console.log(e)
        res.send("Error")
    })
})

//Edit Item POST
app.post("/updateitem/:id", upload, async (req, res) => {
    if(req.file) {
        var dataRecords = {
            $set: {
                name: req.body.name,
                price: req.body.price,
                image: req.file.filename
            }
        }
    } else {
        var dataRecords = {
            $set: {
                name: req.body.name,
                price: req.body.price,
            }
        }
    }

    await Item.findOneAndUpdate({_id: req.params.id}, dataRecords).then(result => {
        if(result) {
            console.log("Item Updated")
            res.redirect("/adPanel")
        } else {
            res.send("Error")
        }
    }).catch(e => {
        res.send("Error in catch")
    })
})

//DELETE Item
app.post("/deleteitem/:id", async (req, res) => {
    await Item.findOneAndDelete({_id: req.params.id}).then(result => {
        if(result) {
            console.log("Item Deleted")
            res.redirect("/adPanel")
        }
    }).catch(e => {
        console.log(e)
        res.send("Error in catch")
    })
})

//Cart GET
app.get("/cart", checkAuth, async (req, res) => {
    await Cart.find({ id: req.session.user._id }).then(cart => {
        // console.log(cart)
        var totalPrice = cart.reduce((total, cart) => {
            return total + cart.price
        }, 0)
        console.log('Total: ', totalPrice)

        res.render("cart.ejs", {
            carts: cart,
            price: totalPrice
        })

    })
})

//Search GET
app.get("/search", checkAuth, async (req, res) => {
    const searchedField = req.query.name
    console.log(searchedField)
    await Item.find(
        {
            "$or":[
                {name:{$regex:searchedField}}
            ]
        }
        )
    .then(item => {
        res.render("custPanel.ejs", {
            items: item
        })
    })
})
// app.get("/search/name?name=/:key", async (req, res) => {
//     let data = await Item.find(
//         {
//             "$or":[
//                 {name:{$regex:req.params.key}}
//             ]
//         }
//     )
//     res.send(data)
// })

//ADD Item to Cart
app.post("/addtocart/:id", async (req, res) => {
    await Item.find({ _id: req.params.id }).then(item => {
        console.log(item)
        const cart = new Cart({
            id: req.session.user._id,
            name: item[0].name,
            price: item[0].price,
            image: item[0].image
        })
        cart.save()
        console.log("Item in Cart Added")
        res.redirect("/custPanel")
    }).catch(error => {
        console.log(error)
        res.send("Error")
    })
})

//DELETE Item
app.post("/deletecart/:id", async (req, res) => {
    await Cart.findOneAndDelete({_id: req.params.id}).then(result => {
        if(result) {
            console.log("Cart Item Deleted")
            res.redirect("/cart")
        }
    }).catch(e => {
        console.log(e)
        res.send("Error in catch")
    })
})

//Update Cart POST
app.post("/update-cart", async (req, res) => {
    if(!req.session.user.cart) {
        req.session.user.cart = {
            items: {},
            totalQty: 0,
            totalPrice: 0
        }
    }
    let cart = req.session.user.cart

    if(!cart.items[req.body.id]) {
        cart.items[req.body.id] = {
            items: req.body,
            qty: 1
        }
        cart.totalQty += 1
        cart.totalPrice += req.body.price
    } else {
        cart.items[req.body.id].qty += 1
        cart.totalQty += 1
        cart.totalPrice += req.body.price
    }
    return res.json({ totalQty: req.session.user.totalQty })
})

//Logout
app.post("/logout", checkAuth, (req, res) => {
    req.session.destroy()
    res.redirect("/")
})

//MIDDLEWARE
function checkAuth(req, res, next) {
    if (req.session.user) {
        return next()
    } else {
        res.redirect("/")
    }
}

let port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Listening on port 3000")
})