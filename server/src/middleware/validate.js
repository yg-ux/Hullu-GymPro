import { body, query, param, validationResult } from 'express-validator';

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

// Auth validators
export const validateRegister = [
  body('gymName').trim().notEmpty().withMessage('Gym name is required').isLength({ min: 2, max: 100 }).withMessage('Gym name must be 2-100 characters'),
  body('ownerName').trim().notEmpty().withMessage('Owner name is required').isLength({ min: 2, max: 100 }).withMessage('Owner name must be 2-100 characters'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/\d/).withMessage('Password must contain at least one number'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number format'),
  handleValidation
];

export const validateLogin = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

export const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').notEmpty().withMessage('New password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/\d/).withMessage('Password must contain at least one number'),
  handleValidation
];

// Customer validators
export const validateCreateCustomer = [
  body('name').trim().notEmpty().withMessage('Customer name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone').optional({ nullable: true, checkFalsy: true }).isLength({ min: 7, max: 20 }).withMessage('Phone number must be 7-20 characters'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('membership_type').optional().isIn(['daily', '1_month', '2_months', '3_months', '6_months', '1_year', '3_days_week']).withMessage('Invalid membership type'),
  body('amount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  handleValidation
];

export const validateUpdateCustomer = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone').optional({ nullable: true, checkFalsy: true }).isLength({ min: 7, max: 20 }).withMessage('Phone number must be 7-20 characters'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  body('membership_type').optional().isIn(['daily', '1_month', '2_months', '3_months', '6_months', '1_year', '3_days_week']).withMessage('Invalid membership type'),
  handleValidation
];

// Payment validators
export const validateCreatePayment = [
  body('customer_id').trim().notEmpty().withMessage('Customer ID is required'),
  body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('payment_method').optional().isIn(['cash', 'card', 'mobile']).withMessage('Invalid payment method'),
  body('membership_type').optional().isIn(['daily', '1_month', '2_months', '3_months', '6_months', '1_year', '3_days_week']).withMessage('Invalid membership type'),
  handleValidation
];

// Staff validators
export const validateCreateStaff = [
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/\d/).withMessage('Password must contain at least one number'),
  body('role').isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
  handleValidation
];

export const validateUpdateStaff = [
  body('username').optional().trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
  handleValidation
];

// Pagination validator helper
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200').toInt(),
  handleValidation
];
