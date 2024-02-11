import Joi from 'joi/lib'

export const createClientValidation = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  contactPerson: Joi.string().min(3).max(50).required(),
  contactPersonEmailAddress: Joi.string().email().required(),
  contactPersonPhoneNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),
  documents: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().required(),
        path: Joi.string().required(),
      })
    )
    .required(),
  countryCode: Joi.string().optional(),
  address: Joi.string().min(5).max(100).optional(),
})

export const updateClientValidation = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  contactPerson: Joi.string().min(3).max(50).required(),
  contactPersonEmailAddress: Joi.string().email().required(),
  contactPersonPhoneNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),
  documents: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().required(),
        path: Joi.string().required(),
      })
    )
    .required(),
  countryCode: Joi.string().optional(),
  address: Joi.string().min(5).max(100).optional(),
})
