import joi from 'joi';

export const registerSchema = joi.object({
    userName: joi.string().min(3).max(30).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    confirmpassword: joi.string().valid(joi.ref('password')).required()
        .messages({ 'any.only': 'passwords do not match' }),

    dateofbirth: joi.date().required()
});
