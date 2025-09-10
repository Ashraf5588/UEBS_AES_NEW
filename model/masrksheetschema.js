const mongoose = require('mongoose');
const marksheetSchema = new mongoose.Schema({
  "subject": { type: String, required: false },
  "studentClass": { type: String, required: false },
  "section": { type: String, required: false },
  "terminal": { type: String, required: false },
  "roll": { type: String, required: false },
  "name": { type: String, required: false },
  "theory": { type: Number, required: false },
  "practical": { type: Number, required: false },
  "totalmarks": { type: Number, required: false }
});
const marksheetsetupschema = new mongoose.Schema({
 "schoolname": { type: String, required: false },
 "schooladdress": { type: String, required: false },
  "schoollogo": { type: String, required: false },
  "principalname": { type: String, required: false },
  "principalsignature": { type: String, required: false },
  "phone": { type: String, required: false },
  "email": { type: String, required: false },
  "website": { type: String, required: false },
}, { strict: false });
exports.marksheetSchema = marksheetSchema;
exports.marksheetsetupSchema = marksheetsetupschema;