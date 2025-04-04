import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'naghamsadaqa217@gmail.com',
    pass: 'rqlkvcvdsrejdnlt', // بدون فراغات
  },
});

const mailOptions = {
  from: '"Test App 👻" <naghamsadaqa217@gmail.com>',
  to: 'reemsadaqa05@gmail.com', // جربي على إيميلك الشخصي
  subject: 'Test Email',
  html: '<h1>This is a test email</h1>',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(' Message sent:', info.messageId);
  }
});
