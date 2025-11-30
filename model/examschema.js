const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
 reg: {type: String, required: true},
 roll: {type: String, required: true},
 name: {type: String, required: true},
 theorymarks: {type: Number, required: true},
 practicalmarks: {type: Number, required: false},
 totalpracticalmarks: {type: Number, required: false},
  attendance: {type: Number, required: false},
  subject: {type: String, required: false},
  terminal: {type: String, required: false},
  theoryfullmarks: {type: Number, required: false},
  passMarks: {type: Number, required: false},
  practicalfullmarks: {type: Number, required: false},
  creditHour: {type: Number, required: false},
});

module.exports = {examSchema};
 


