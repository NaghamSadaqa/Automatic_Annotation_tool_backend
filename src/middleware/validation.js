import joi from 'joi';
import { registerSchema } from '../modules/authentication/auth.validation.js';
const validation = (schema)=>{
    return (req, res , next)=>{
        const inputdata= {...req.body, ...req.params}
        const result= schema.validate(inputdata,{abortEarly:false});
        if(result?.error){
            return res.status(400).json({message:"validation Error", error: result.error.details});
        }else{
            next();
        }
    }
}

export default validation;