import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();


export const sendEmail = async (to, subject, html) => {
  try {
    // إنشاء الاتصال مع خدمة البريد
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587, 
      secure: false, 
      requireTLS: true, 
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    // إرسال البريد الإلكتروني
    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully");

  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};