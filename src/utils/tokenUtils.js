import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      name: user.userName,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { user_id: user.user_id },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};