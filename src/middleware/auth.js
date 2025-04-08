import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

 export const authenticateToken = (req, res, next) => {
    try {
        const token = req.header("Authorization")?.split(" ")[1]; 
        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 

        console.log("Decoded Token:", decoded); 

        if (!decoded.user_id) { 
            return res.status(400).json({ message: "User ID missing in token" });
        }

        req.user = decoded; 
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

 export const authTokenSendcode = (req, res, next) => {
    try {
      const token = req.header("Authorization")?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "No token, authorization denied" });
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // هيك بتخزن الـ email وغيره
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };



