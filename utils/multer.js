const multer = require("multer");
const path = require("path");


module.exports = multer({
  storage: multer.diskStorage({}),
  filesFilter: (req, files, cb) => {
    let ext = path(files.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      cb(new Error("Unsupported file type!"), false);
      return;
    }
    cb(null, true);
  },
});