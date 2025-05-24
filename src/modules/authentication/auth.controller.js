import UserModel from '../../../DB/model/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { where } from 'sequelize';
import {nanoid}  from 'nanoid';
import {customAlphabet} from 'nanoid';
import dotenv from 'dotenv';
import {sendEmail} from '../../utils/SendEmail.js';
import { AppError } from '../../utils/AppError.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/tokenUtils.js';
dotenv.config();

 //register 
 export const register = async (req, res) => {
  try {
    const { userName, email, password, confirmPassword, dateofbirth } = req.body;

    // Check user existence
    const existingUser = await UserModel.findOne({ where: { email } })
    if (existingUser) {
      // 409: conflict : تعارض الايميل المدخل مع ايميل موجود أصلا في قاعدة البيانات

      return res.status(409).send({
        ErrorMsg: "Oops! An error occurred during registration process. Please enter a valid data and try again",
        ErrorFields: {
          email: "This email is already used. Please type another one"
        }
      })

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
        if (err.path === 'email') {
          fieldErrors.email = "This email is already used. Please type another one";
        } else if (err.path === 'userName') {
          fieldErrors.userName = "This username is already taken. Please choose another";
        } else {
          fieldErrors[err.path] = err.message;
        }
      });
      return res.status(409).send({
        ErrorMsg: "Oops! There are some conflicts in your data. Please check the errors and try again.",
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
        ErrorMsg: "Are you sure of this user name? user name must has at least 3 characters with maximum 30 character",
        ErrorFields: fieldErrors
      });
    }

    // System error: could be runtime exception (for example x = 10/0 )
    return res.status(500).send({
      ErrorMsg: "Oh Sorry! The operation could not be completed due to a server error. Please try again later",
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
      return res.status(401).send({
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
   
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // ارسال refreshToken بالكوكي HttpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true, // مهم في الانتاج (https)
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ايام
    });

    return res.status(200).send({
      message: "Login successful",
      token: accessToken
    });


  } catch (error) {
    return res.status(500).send({
      ErrorMsg: "Internal server error",
      ErrorFields: null
    });
  }
};




//send code(forget password) هاي في حال نسيان المستخدم لكلمة المرور رح اخليه يدخل ايميله وابعتله كود
export const sendCode = async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ where: { email } });
  if (!user) {
    return res.status(401).send({
      ErrorMsg: "Incorrect Email ",
      ErrorFields: null
    });
  }


  const generateCode = customAlphabet('1234567890AaBbCcDdEeFF', 6);
  const code = generateCode();
  const hashedCode = await bcrypt.hash(code, 8);

  await UserModel.update({
    sendCode: hashedCode,
  }, { where: { email } });

  const html = `<h3>Your password reset code is: <b>${code}</b></h3>`;
  await sendEmail(email, "Reset Password Code", html);

  // إصدار توكن يحتوي على الإيميل فقط
  const token = jwt.sign({ email }, process.env.JWT_SECRET);

  return res.status(200).json({
    message: "Code sent successfully",
    token
  });
};

//هون رح تيجيله شاشة يدخل فيها الكود حتى نتأكد منه 
export const verifyCode = async (req, res) => {
  const { code } = req.body; // فقط الكود من body
  const email = req.user.email; // من التوكن بعد الميدل وير

  try {
    const user = await UserModel.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCodeValid = await bcrypt.compare(code, user.sendCode);
    if (!isCodeValid) return res.status(400).json({ message: 'Invalid code' });

    return res.status(200).json({ message: 'Code verified successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};


// هون بحدث كلمة المرور وهيك جاهز 
export const resetPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;

  // التحقق من التوكن باستخدام الميدل وير
  const email = req.user.email; // استخرج الإيميل من الـ user الموجود في req بعد التحقق من التوكن

  // التأكد من تطابق كلمة المرور الجديدة مع التأكيد
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // تشفير كلمة المرور الجديدة
  const hashedPassword = await bcrypt.hash(newPassword, 8);

  try {
    // تحديث كلمة المرور في قاعدة البيانات
    await UserModel.update(
      { password: hashedPassword },
      { where: { email } }
    );
    await UserModel.update(
      { sendCode: null },
      { where: { email } }
    );

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(400).json({ message: 'Error resetting password' });
  }
};

//log out
//router.post("/logout", authenticateToken, (req, res) => {
 // return res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
//});
