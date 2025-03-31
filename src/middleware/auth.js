import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

const authenticateToken = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.split(" ")[1]; // استخراج التوكن
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); // فك التوكن

        console.log("Decoded Token:", decoded); // ✅ طباعة محتوى التوكن للتحقق

        if (!decoded.user_id) { // ✅ التحقق من وجود user_id بدلاً من id
            return res.status(400).json({ message: "User ID missing in token" });
        }

        req.user = decoded; // حفظ بيانات المستخدم في الطلب
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};



export default authenticateToken;