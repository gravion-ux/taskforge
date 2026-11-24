const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    position: { type: Number, default: 0 },
  },
  { _id: true }
);

const boardSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
    columns: { type: [columnSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Board', boardSchema);
