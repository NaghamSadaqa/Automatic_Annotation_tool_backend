
import {Router} from 'express';
import UserModel from '../../../DB/model/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validation from '../../middleware/validation.js';
import {registerSchema} from './auth.validation.js'
import { where } from 'sequelize';
import {nanoid}  from 'nanoid';
import {customAlphabet} from 'nanoid';
import dotenv from 'dotenv';
import {sendEmail} from '../../utils/SendEmail.js';
dotenv.config();
const router = Router();

// register
router.post('/register',validation(registerSchema) ,async(req, res)=>{
  try{
    const {userName, email , password , confirmpassword ,dateofbirth}= req.body;

    const hashedPassword = bcrypt.hashSync("password", 8);

    await UserModel.create({userName, email,password:hashedPassword ,dateofbirth });

    return res.status(201).json({message:"sucsess"});
    }catch (error){

        return res.status(400).json({message:"Server erorr",error})
      
    } });
    

// log in
router.post('/login', async (req,res)=>{
    const {email, password}= req.body;
    const user = await UserModel.findOne({
     where:{email:email}
    });
    if(user == null){
     return res.status(404).json({message:"invalid email"});
    }
    const check = await bcrypt.compareSync("password",user.password);
    if(check == false){
     return res.status(404).json({message:"invalid password"});
    }
    const token = jwt.sign({ user_id:user.user_id,name:user.userName , role:user.role }, process.env.JWT_SECRET);
    return res.status(200).json({message:"sucsess", token});
    });




    // forget password 
    // لما ينسى المستخدم كلمة المرور رح نبعتله كود على الايميل تبعه فالمفروض يدخل ايميله 
    router.post('/sendCode',async (req,res)=>{
    try{
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
    return res.status(200).json({message:"success"});

  } catch (error) {
    console.error('Error sending reset code:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// بعدها منخليه يرجع يعين كلمة السر من جديد ويدخل الكود حتى نتأكد انه هو
router.post("/reset-password", async (req,res)=>{
  try{
  const {email,code,password} = req.body;
  const user = await UserModel.findOne({where:{email}});
   if(!user){
    return res.status(404).json({error:"User not found!"});
   }
   if(user.sendCode != code){
    return res.status(404).json({error:"invalid code"});
   }
  const hashedPassword= await bcrypt.hash(password,8);
  user.password= hashedPassword;
  user.sendCode=null;
  await user.save();
  res.status(200).json({message:"Password reset successfully!"});
  }catch(error){
    res.status(500).json({ error: "Internal server error!" });
  }
} );



    
    export default router;