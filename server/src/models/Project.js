const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// The owner always counts as a member.
projectSchema.methods.hasMember = function (userId) {
  const id = String(userId);
  return String(this.owner) === id || this.members.some((m) => String(m) === id);
};

module.exports = mongoose.model('Project', projectSchema);
