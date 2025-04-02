import express from "express";
import multer from "multer";
import path from "path";
import FileManager from "../../DB/model/filemanager.js";

const storage = multer.diskStorage({
    destination: (req,file , cb) => {
        cb(null, "uploads/"); 
    },
    filename: (req,file , cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const fileFilter = (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (fileExt === ".csv" || fileExt === ".xls" || fileExt === ".xlsx") {
        cb(null, true);
    } else {
        cb(new Error("only csv or Excel files are allowed"), false);
    }
};

const upload = multer({ storage, fileFilter });
export default upload;

