const mongoose = require('mongoose');

const teacherRecordSchema = new mongoose.Schema(
  {
    teacherName: {
      type: String,
      required: true,
      trim: true
    },
    issues: [
      {
        dateBs: { type: String, default: '' },
        issue: { type: String, default: '' },
        halfLeave: { type: Boolean, default: false },
        fullLeave: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = { teacherRecordSchema };
