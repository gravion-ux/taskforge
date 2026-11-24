const express = require('express');
const Project = require('../models/Project');
const Board = require('../models/Board');
const Task = require('../models/Task');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../utils/errors');
const { requireFields, validateString } = require('../utils/validate');
const { authRequired, projectMember, projectOwner } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description } = req.body || {};
    requireFields(req.body, ['name']);
    validateString(name, 'name', { max: 120 });
    const project = await Project.create({
      name: String(name).trim(),
      description: description ? String(description).slice(0, 2000) : '',
      owner: req.user._id,
      members: [req.user._id],
    });
    const columns = DEFAULT_COLUMNS.map((title, i) => ({ title, position: i }));
    await Board.create({ project: project._id, columns });
    res.status(201).json({ project });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query =
      req.user.role === 'admin'
        ? {}
        : { $or: [{ owner: req.user._id }, { members: req.user._id }] };
    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members', 'name email')
      .sort({ updatedAt: -1 });
    res.json({ projects });
  })
);

router.get('/:projectId', projectMember, (req, res) => res.json({ project: req.project }));

router.patch(
  '/:projectId',
  projectMember,
  projectOwner,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body || {};
    if (name !== undefined) {
      validateString(name, 'name', { max: 120 });
      req.project.name = String(name).trim();
    }
    if (description !== undefined) req.project.description = String(description).slice(0, 2000);
    await req.project.save();
    res.json({ project: req.project });
  })
);

router.delete(
  '/:projectId',
  projectMember,
  projectOwner,
  asyncHandler(async (req, res) => {
    const board = await Board.findOne({ project: req.project._id });
    if (board) {
      await Task.deleteMany({ board: board._id });
      await board.deleteOne();
    }
    await req.project.deleteOne();
    res.status(204).send();
  })
);

router.post(
  '/:projectId/members',
  projectMember,
  projectOwner,
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    requireFields(req.body, ['email']);
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) throw new ApiError(404, 'No user with that email');
    if (!req.project.members.some((m) => String(m) === String(user._id))) {
      req.project.members.push(user._id);
      await req.project.save();
    }
    res.json({ project: req.project });
  })
);

router.delete(
  '/:projectId/members/:userId',
  projectMember,
  projectOwner,
  asyncHandler(async (req, res) => {
    if (String(req.project.owner) === req.params.userId) {
      throw new ApiError(400, 'The project owner cannot be removed');
    }
    req.project.members = req.project.members.filter((m) => String(m) !== req.params.userId);
    await req.project.save();
    res.json({ project: req.project });
  })
);

module.exports = router;
