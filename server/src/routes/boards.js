const express = require('express');
const Board = require('../models/Board');
const Task = require('../models/Task');
const { asyncHandler, ApiError } = require('../utils/errors');
const { requireFields, validateString } = require('../utils/validate');
const { authRequired, projectMember, projectOwner } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authRequired, projectMember);

async function loadBoard(projectId) {
  const board = await Board.findOne({ project: projectId });
  if (!board) throw new ApiError(404, 'Board not found');
  return board;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const board = await loadBoard(req.project._id);
    const tasks = await Task.find({ board: board._id })
      .populate('assignee', 'name email')
      .sort({ position: 1, createdAt: 1 });
    res.json({ board, tasks });
  })
);

router.post(
  '/columns',
  projectOwner,
  asyncHandler(async (req, res) => {
    const { title } = req.body || {};
    requireFields(req.body, ['title']);
    validateString(title, 'title', { max: 60 });
    const board = await loadBoard(req.project._id);
    board.columns.push({ title: String(title).trim(), position: board.columns.length });
    await board.save();
    res.status(201).json({ board });
  })
);

router.patch(
  '/columns/:columnId',
  projectOwner,
  asyncHandler(async (req, res) => {
    const { title } = req.body || {};
    requireFields(req.body, ['title']);
    validateString(title, 'title', { max: 60 });
    const board = await loadBoard(req.project._id);
    const column = board.columns.id(req.params.columnId);
    if (!column) throw new ApiError(404, 'Column not found');
    column.title = String(title).trim();
    await board.save();
    res.json({ board });
  })
);

router.delete(
  '/columns/:columnId',
  projectOwner,
  asyncHandler(async (req, res) => {
    const board = await loadBoard(req.project._id);
    const column = board.columns.id(req.params.columnId);
    if (!column) throw new ApiError(404, 'Column not found');
    const taskCount = await Task.countDocuments({ board: board._id, columnId: column._id });
    if (taskCount > 0) throw new ApiError(400, 'Move or delete the tasks in this column first');
    column.deleteOne();
    board.columns.forEach((c, i) => (c.position = i));
    await board.save();
    res.json({ board });
  })
);

module.exports = router;
