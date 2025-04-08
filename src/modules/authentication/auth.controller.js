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
  try {
    const { userName, email, password, confirmPassword, dateofbirth } = req.body;

    // Check user existence
    const existingUser = await UserModel.findOne({ where: { email } });
    if (existingUser) {
		// 409: conflict : تعارض الايميل المدخل مع ايميل موجود أصلا في قاعدة البيانات
      return res.status(409).send({
        ErrorMsg: "Email already registered",
        ErrorFields: {
          email: "Please enter another email address"
        }
      });
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 8);

    // Create the user
    await UserModel.create({
      userName,
      email,
      password: hashedPassword,
      dateofbirth
    });

    return res.status(201).send({ message: "Account created successfully" });

  } catch (error) {
	  
    // Handle Sequelize unique constraint errors
	// هون السيستم ضرب ايرور بسبب تعارض الايميل مع ايميل مسجل مسبقا
    if (error.name === 'SequelizeUniqueConstraintError') {
      const fieldErrors = {};
      error.errors.forEach((err) => {
        fieldErrors[err.path] = err.message;
      });
	  
      return res.status(409).send(
	  {
        ErrorMsg: "Duplicate field(s) found",
        ErrorFields: fieldErrors
      });
    }

    // Handle validations error
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = {};
      error.errors.forEach((err) => {
        fieldErrors[err.path] = err.message;
      });

      return res.status(422).send({
        ErrorMsg: "Validation error",
        ErrorFields: fieldErrors
      });
    }

    // System error: could be runtime exception (for example x = 10/0 )
    return res.status(500).send({
      ErrorMsg: "Internal server error",
      ErrorFields: null
    });
  };
}




//login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // البحث عن المستخدم حسب الإيميل
    const user = await UserModel.findOne({ where: { email } });

    if (!user) {
      return res.status(404).send({
        ErrorMsg: "Incorrect Email or password",
        ErrorFields: null
      });
    }

    // التحقق من صحة كلمة المرور
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({
        ErrorMsg: "Incorrect Email or password",
        ErrorFields: null
      });
    }

    // إنشاء التوكن
    const token = jwt.sign(
      {
        user_id: user.user_id,
        name: user.userName,
        role: user.role
      },
      process.env.JWT_SECRET,
      
    );

    return res.status(200).send({
      message: "Login successful",
      token
    });

  } catch (error) {
    return res.status(500).send({
      ErrorMsg: "Internal server error",
      ErrorFields: null
    });
  }
};






//send code(forget password) هاي في حال نسيان المستخدم لكلمة المرور رح اخليه يدخل ايميله وابعتله كود
export const sendCode =async (req,res)=>{
    
    const {email} = req.body;

    const user = await UserModel.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const generateCode = customAlphabet('1234567890abcdefABCD', 4);
    const code = generateCode(); // شفري الكود نغم
    const hashcode = bcrypt.hashSync(code,8);

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
    console.log("code");

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
// ثلث مراحل حتى اعمل استعادة لكلمة المرور , 
//المرحلة الاولى : دخل ايميلك ببعتلك كود وبخزن الكود بالداتا بيس وبرسله توكين فيه الايميل 
// وهو حاليا بعده عن ارسال الايميل
// يعني صار اليوزر موديلي توكين اعرف مين اليوزر الي بده يغير ايميله
// بعدها المستخدم بنتقل للمرحلة الثانية بدخل الكود هاد كله بال api تبع ارسال الكود
//  الخطوة الثانية: الابي اي تبع الريست بعد ما وصلني التوكين صحيح وبعد ما دخل الكود ودخل التوكين تبعه وطلع صحيح برجعله ريسبونس فاضي انه خلص لوج ان 
//المرحلة الثالثة : بظهر للمستخدم باسوورد جديد وكونفيرم لهاد النيو باسوورد 