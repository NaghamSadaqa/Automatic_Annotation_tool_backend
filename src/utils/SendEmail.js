import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    service:"gmail",
    auth: {
      user: "naghamsadaqa217@gmail.com",
      pass: "rqlkvcvdsrejdnlt",
    },
  });

export async function sendEmail(to, subject, body){
  try{
  const info = await transporter.sendMail({
    from: '"Graduation Project" <naghamsadaqa217@gmail.com>', // sender address
    to,
    subject,
    html:body,
  });
  console.log('Email sent:', info.messageId);
} catch (error) {
    console.error("Error sending email:", error);
}
}