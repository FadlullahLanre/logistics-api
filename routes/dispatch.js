const express = require("express")
const router = express.Router();

const {
    getAllDispatch,
    createDispatch,
    getDispatch,
    getByCategory,
    updateDispatch,
    deleteDispatch
} = require("../controllers/dispatch")

const { protect } = require("../controllers/user")


router.route("/").post(protect, createDispatch).get(protect, getAllDispatch)
router.route("/:category").get(protect, getByCategory)
router.route("/:id").get(protect, getDispatch).patch(protect, updateDispatch).delete(protect, deleteDispatch)

module.exports = router