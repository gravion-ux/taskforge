const express = require('express');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../utils/errors');
const { requireFields, validateEmail, validatePassword, validateString, validateEnum } = require('../utils/validate');
const { signToken, authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    requireFields(req.body, ['name', 'email', 'password']);
    validateString(name, 'name', { max: 100 });
    validateEmail(email);
    validatePassword(password);
    if (role !== undefined) validateEnum(role, 'role', ['admin', 'member']);

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    // The very first account becomes an admin so a fresh install is usable;
    // afterwards, creating admins requires an existing admin token.
    const userCount = await User.countDocuments();
    let finalRole = 'member';
    if (userCount === 0) finalRole = 'admin';
    else if (role === 'admin' && req.user && req.user.role === 'admin') finalRole = 'admin';

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase(),
      passwordHash: await User.hashPassword(password),
      role: finalRole,
    });
    res.status(201).json({ token: signToken(user), user });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    requireFields(req.body, ['email', 'password']);
    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Invalid email or password');
    }
    res.json({ token: signToken(user), user });
  })
);

router.get('/me', authRequired, (req, res) => res.json({ user: req.user }));

// Admin-only: list users (used by the UI for assignee/member pickers).
router.get('/users', authRequired, requireRole('admin'), asyncHandler(async (req, res) => {
  const users = await User.find().sort({ name: 1 }).limit(200);
  res.json({ users });
}));

module.exports = router;
