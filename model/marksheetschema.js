const mongoose = require('mongoose');

const terminalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workingDays: { type: Number, required: true }
});
const marksheetsetupschemaForAdmin = new mongoose.Schema({
  schoolName: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  website: { type: String },
  academicYear: { type: String },
  totalTerminals: { type: Number, required: false },
  
  terminals: [terminalSchema],
});

const routineSchema = new mongoose.Schema({
 nepalidate: { type: String, required: true },
 subject: { type: String, required: true },
studentClass: { type: String, required: true },
terminal: { type: String, required: true },
});
module.exports = { terminalSchema, marksheetsetupschemaForAdmin, routineSchema };