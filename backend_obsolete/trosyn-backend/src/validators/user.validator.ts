import Joi from 'joi';

export const createUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
    .required(),
  role: Joi.string().valid('user', 'admin').default('user'),
  firstName: Joi.string().max(50),
  lastName: Joi.string().max(50),
  isActive: Joi.boolean().default(true)
}).options({ abortEarly: false });

export const updateUserSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email(),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')),
  role: Joi.string().valid('user', 'admin'),
  firstName: Joi.string().max(50),
  lastName: Joi.string().max(50),
  isActive: Joi.boolean()
}).min(1).options({ abortEarly: false });

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }
    next();
  };
};
