import joi from 'joi';

export const registerSchema = joi.object({
    userName: joi.string().min(3).max(30).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    confirmPassword: joi.string().valid(joi.ref('password')).required()
        .messages({ 'any.only': 'passwords do not match' }),

        dateofbirth: joi.date()
    .less(new Date(new Date().setFullYear(new Date().getFullYear() - 18)))
    .required()
    .messages({
      'date.less': 'You must be at least 18 years old',
      'date.base': 'Invalid date format',
    }),
});
    

