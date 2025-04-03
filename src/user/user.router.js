import UserModel from "../../DB/model/user.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { where } from 'sequelize';
import {Router} from 'express';
const router= Router();

router.post("/reset-password", async (req,res)=>{
  try{
  const {email, newPassword} = req.body;
  const user = await UserModel.findOne({where:{email}});
   if(!user){
    return res.status(404).json({error:"User not found!"});
   }
  const hashedPassword= await bcrypt.hash(newPassword,8);
  user.password= hashedPassword;
  await user.save();
  res.status(200).json({message:"Password reset successfully!"});
  }catch(error){
    res.status(500).json({ error: "Internal server error!" });
  }
} );
export default router;