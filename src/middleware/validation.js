import Joi from 'joi';
import { AppError } from '../utils/AppError.js';

const validation = (schema) => {
  return (req, res, next) => {
    const inputData = { ...req.body, ...req.params, ...req.query };

    const result = schema.validate(inputData, { abortEarly: false });

    if (result.error) {
      const ErrorFields = {};

      result.error.details.forEach((e) => {
        const field = e.path[0];
        ErrorFields[field] = e.message;
      });

      return res.status(422).send({
        ErrorMsg: "Oops! An error occurred during registration process. Please enter a valid data and try again",
        ErrorFields,
      });
    }

    next();
  };
}
export default validation;
