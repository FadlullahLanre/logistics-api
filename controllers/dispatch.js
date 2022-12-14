const Dispatch = require("../models/dispatch")
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');
const AppError = require('../utils/appError');


const order_id = () => {
    let result = 'isend';
    let length = 5// Customize the length here.
    for (let i = length; i > 0; --i) {
        result += `${Math.floor(Math.random() * 10)}`
    }
    return result
}

const getAllDispatch =  catchAsync ( async (req, res, next) => {
    const dispatch = await Dispatch.find({createdBy:req.user.id})
    if(!dispatch){
        return next(new AppError("You have no pending tasks", 404))
    }
    res.status(200).json(dispatch)
});

const getByOrderId =  catchAsync ( async (req, res, next) => {
    const dispatch = await Dispatch.findOne({createdBy:req.user.id, order_id: req.params.order_id})
    if(!dispatch){
        return next(new AppError(`No dispatch by category: ${req.params.category}`, 404))
    }
    res.status(200).json(dispatch)
});

const createDispatch =  catchAsync( async (req, res) => {
    req.body.order_id = order_id()
    req.body.createdBy = req.user.id
    const dispatch = await Dispatch.create(req.body)
    res.status(201).json({dispatch})

});

const getDispatch = catchAsync( async (req, res, next) => {
    const singleDispatch = await Dispatch.findOne({_id : req.params.id, createdBy: req.user.id})

    if(!singleDispatch){
        return next(new AppError(`no dispatch with id : ${req.params.id}`, 400))
    }
    res.status(200).json({singleDispatch})
})

const updateDispatch =  catchAsync( async (req, res, next) => {
    const updateDispatch = await Dispatch.findOneAndUpdate({_id : req.params.id, createdBy: req.user.id}, req.body, {
        new:true,
        runValidators : true
    })
    if (!updateDispatch){
        return next(new AppError(`no dispatch with id : ${req.params.id}`, 404))
    }
    res.status(200).json(updateDispatch)
   
})

const deleteDispatch =  catchAsync( async (req, res, next) => {
    const deleteDispatch = await Dispatch.findOneAndDelete({_id : req.params.id, createdBy: req.user.id})

    if(!deleteDispatch){
        return next(new AppError(`no task with id : ${req.params.id}`, 404))
    }
    res.status(200).json({deleteDispatch})
})

module.exports = {
    getAllDispatch,
    createDispatch,
    getDispatch,
    updateDispatch,
    deleteDispatch,
    getByOrderId
}