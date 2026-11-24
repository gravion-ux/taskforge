const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const { ApiError, asyncHandler } = require('../utils/errors');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

const authRequired = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');
  req.user = user;
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions for this action'));
    }
    return next();
  };
}

// Loads req.project and enforces membership. Admins may access any project.
const projectMember = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  if (req.user.role !== 'admin' && !project.hasMember(req.user._id)) {
    throw new ApiError(403, 'You are not a member of this project');
  }
  req.project = project;
  next();
});

// Only the project owner (or a global admin) may manage membership/structure.
const projectOwner = (req, res, next) => {
  if (req.user.role === 'admin' || String(req.project.owner) === String(req.user._id)) return next();
  return next(new ApiError(403, 'Only the project owner can do this'));
};

module.exports = { signToken, authRequired, requireRole, projectMember, projectOwner };
