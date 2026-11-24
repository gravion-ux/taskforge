const express = require('express');
const Board = require('../models/Board');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { asyncHandler, ApiError } = require('../utils/errors');
const { requireFields, validateString, validateEnum } = require('../utils/validate');
const { authRequired, projectMember } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authRequired, projectMember);

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

async function loadBoardAndColumn(projectId, columnId) {
  const board = await Board.findOne({ project: projectId });
  if (!board) throw new ApiError(404, 'Board not found');
  if (columnId && !board.columns.id(columnId)) throw new ApiError(400, 'Invalid columnId');
  return board;
}

async function loadTask(req) {
  const task = await Task.findOne({ _id: req.params.taskId, project: req.project._id });
  if (!task) throw new ApiError(404, 'Task not found');
  return task;
}

function validateLabels(labels) {
  if (labels === undefined) return undefined;
  if (!Array.isArray(labels) || labels.some((l) => typeof l !== 'string' || l.length > 30)) {
    throw new ApiError(400, 'labels must be an array of strings (max 30 chars each)');
  }
  return [...new Set(labels.map((l) => l.trim()).filter(Boolean))].slice(0, 10);
}

function parseDueDate(value) {
  if (value === null || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'dueDate must be a valid date');
  return d;
}

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, description, columnId, assignee, labels, priority, dueDate } = req.body || {};
    requireFields(req.body, ['title', 'columnId']);
    validateString(title, 'title', { max: 200 });
    if (priority !== undefined) validateEnum(priority, 'priority', PRIORITIES);
    const board = await loadBoardAndColumn(req.project._id, columnId);
    const count = await Task.countDocuments({ board: board._id, columnId });
    const task = await Task.create({
      board: board._id,
      project: req.project._id,
      columnId,
      title: String(title).trim(),
      description: description ? String(description).slice(0, 5000) : '',
      assignee: assignee || null,
      labels: validateLabels(labels) || [],
      priority: priority || 'medium',
      dueDate: parseDueDate(dueDate),
      position: count,
      createdBy: req.user._id,
    });
    res.status(201).json({ task });
  })
);

router.get(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = await loadTask(req);
    await task.populate('assignee', 'name email');
    res.json({ task });
  })
);

router.patch(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = await loadTask(req);
    const { title, description, columnId, assignee, labels, priority, dueDate, position } = req.body || {};
    if (title !== undefined) {
      validateString(title, 'title', { max: 200 });
      task.title = String(title).trim();
    }
    if (description !== undefined) task.description = String(description).slice(0, 5000);
    if (columnId !== undefined) {
      await loadBoardAndColumn(req.project._id, columnId);
      task.columnId = columnId;
    }
    if (assignee !== undefined) task.assignee = assignee || null;
    const cleanLabels = validateLabels(labels);
    if (cleanLabels !== undefined) task.labels = cleanLabels;
    if (priority !== undefined) {
      validateEnum(priority, 'priority', PRIORITIES);
      task.priority = priority;
    }
    if (dueDate !== undefined) task.dueDate = parseDueDate(dueDate);
    if (position !== undefined) {
      if (typeof position !== 'number' || position < 0) throw new ApiError(400, 'position must be a non-negative number');
      task.position = position;
    }
    await task.save();
    res.json({ task });
  })
);

router.delete(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const task = await loadTask(req);
    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();
    res.status(204).send();
  })
);

// ---- Comments (nested under a task) ----

router.get(
  '/:taskId/comments',
  asyncHandler(async (req, res) => {
    const task = await loadTask(req);
    const comments = await Comment.find({ task: task._id })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    res.json({ comments });
  })
);

router.post(
  '/:taskId/comments',
  asyncHandler(async (req, res) => {
    const task = await loadTask(req);
    const { body } = req.body || {};
    requireFields(req.body, ['body']);
    validateString(body, 'body', { max: 2000 });
    const comment = await Comment.create({ task: task._id, author: req.user._id, body: String(body).trim() });
    await comment.populate('author', 'name email');
    res.status(201).json({ comment });
  })
);

router.delete(
  '/:taskId/comments/:commentId',
  asyncHandler(async (req, res) => {
    const task = await loadTask(req);
    const comment = await Comment.findOne({ _id: req.params.commentId, task: task._id });
    if (!comment) throw new ApiError(404, 'Comment not found');
    const isAuthor = String(comment.author) === String(req.user._id);
    const isOwner = String(req.project.owner) === String(req.user._id);
    if (!isAuthor && !isOwner && req.user.role !== 'admin') {
      throw new ApiError(403, 'You can only delete your own comments');
    }
    await comment.deleteOne();
    res.status(204).send();
  })
);

module.exports = router;
