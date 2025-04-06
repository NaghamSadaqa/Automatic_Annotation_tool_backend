import UserModel from '../../../DB/model/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { where } from 'sequelize';
import {nanoid}  from 'nanoid';
import {customAlphabet} from 'nanoid';
import dotenv from 'dotenv';
import {sendEmail} from '../../utils/SendEmail.js';
import { AppError } from '../../utils/AppError.js';
dotenv.config();

 //register 
export const register = async(req, res , next)=>{
  
    const {userName, email , password , confirmPassword ,dateofbirth}= req.body;
    if (password !== confirmPassword) {
        //return res.status(400).json({ message: "Passwords do not match" });
        return next(new AppError("Passwords do not match", 404));
      }
  
      const existingUser = await UserModel.findOne({ where: { email } });
      if (existingUser) {
        //return res.status(409).json({ message: "Email already registered" });
        return next(new AppError("Email already registered",400));
      }

    const hashedPassword = bcrypt.hashSync( password , 8);

    await UserModel.create({userName, email,password:hashedPassword ,dateofbirth });

    return res.status(201).json({message:"sucsess"});
};

//login
export const login =  async (req,res)=>{
    const {email, password}= req.body;
    const user = await UserModel.findOne({
     where:{email:email}
    });
    if(user == null){
     return res.status(404).json({message:"invalid email"});
    }
    const check = await bcrypt.compareSync( password ,user.password);// شلت اقواس التنصيص عن كلمة باسوورد برجعلها
    if(check == false){
     return res.status(404).json({message:"invalid password"});
    }
    const token = jwt.sign({ user_id:user.user_id,name:user.userName , role:user.role }, process.env.JWT_SECRET);
    return res.status(200).json({message:"sucsess", token});
    };

//send code(forget password) هاي في حال نسيان المستخدم لكلمة المرور رح اخليه يدخل ايميله وابعتله كود
export const sendCode =async (req,res)=>{
    
    const {email} = req.body;

    const user = await UserModel.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const generateCode = customAlphabet('1234567890abcdefABCD', 4);
    const code = generateCode();


    await UserModel.update({ sendCode: code }, { where: { email } });

    const html = `<h2>code is ${code}</h2>`;
    console.log(email, html);
    await sendEmail(email,"resetPassword", html);
    console.log("sendEmail function:", typeof sendEmail);
    return res.status(200).json({message:"Code sent successfully"});

};


// بعدها منخليه يرجع يعين كلمة السر من جديد ويدخل الكود حتى نتأكد انه هو
export const resetPassword= async (req,res)=>{

    const {email,code,password} = req.body;

    const user = await UserModel.findOne({where:{email}});
     if(!user){
      return res.status(404).json({error:"User not found!"});
     }
     if(user.sendCode !== code){
      return res.status(404).json({error:"invalid code"});
     }
    const hashedPassword= await bcrypt.hash(password,8);
    user.password= hashedPassword;
    user.sendCode=null;
    await user.save();
    res.status(200).json({message:"Password reset successfully!"});
  
  };