import Joi from 'joi';
import { AppError } from '../utils/AppError.js';

const validation = (schema) => {
  return (req, res, next) => {
    const inputData = { ...req.body, ...req.params, ...req.query };

    const result = schema.validate(inputData, { abortEarly: false });

    if (result.error) {
      const messages = result.error.details.map((e) => e.message);
      return next(new AppError("Validation Error", 400, messages));
    }

    next();
  };
};

export default validation;
