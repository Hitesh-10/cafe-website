const mongoose = require('mongoose')

const cartSchema = new mongoose.Schema({
    id: {
        type: String,
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String
    }
})

module.exports = mongoose.model("Cart", cartSchema)