
import {Router} from 'express';
import validation from '../../middleware/validation.js';
import {registerSchema} from './auth.validation.js'
import { asyncHandler } from '../../utils/catchError.js';
import { login , register, resetPassword, sendCode} from './auth.controller.js';
import dotenv from 'dotenv';
dotenv.config();
const router = Router();

// register
router.post('/register',validation(registerSchema) , register ); 
// log in
router.post('/login', login );
// forget password 
router.post('/sendCode', asyncHandler(sendCode));
router.post("/reset-password", asyncHandler(resetPassword));

    
export default router;