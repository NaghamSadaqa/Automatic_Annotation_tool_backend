
import {Router} from 'express';
import UserModel from '../../../DB/model/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validation from '../../middleware/validation.js';
import {registerSchema} from './auth.validation.js'
import { where } from 'sequelize';
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
    const token = jwt.sign({ id:user.id,name:user.userName , role:user.role }, 'NaghamSadaqa');
    return res.status(200).json({message:"sucsess", token});
    });
    export default router;