const mongoose = require("mongoose")

const DispatchSchema = new mongoose.Schema({
    sendersName: {
        type: String,
        required: [true, "must provide sender's name"],
        trim: true
    },
    order_id: {
        type: String,
    },
    status: {
        type:String,
        enum : ['pending', 'picked-up', 'in-transit', 'delivered' ],
        default: 'pending'
    },
    sendersAddress: {
        type: String,
        required: [true, "must provide an address"],
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        select: false
    },
    category : {
        type: String,
        enum : ['electronics', 'clothing', 'documents', 'food', 'shoes', 'health', 'products'],
        required : [true, "must provide category"]
    },
    delivery_type: {
        type: String,
        enum: ['next-day', 'instant']
    },
    sendersphoneNumber : {
        type: String,
        required : [true, "must provide a valid phone number"]

    },
    receiversName: {
        type: String,
        required: [true, "must provide receiver's name"],
        trim: true
    },
    receiversAddress: {
        type: String,
        required: [true, "must provide an address"],
        trim: true
    },
    sendersphoneNumber : {
        type: String,
        required : [true, "must provide a valid phone number"]

    },
    receiversphoneNumber : {
        type: String,
        required : [true, "must provide a valid phone number"]

    },
},
    { timestamps: true },

)

module.exports = mongoose.model("Dispatch", DispatchSchema)