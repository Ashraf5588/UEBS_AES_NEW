const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  "subject": { type: String, required: false },
  "forClass": { type: String, required: false },
  "max": { type: String, required: false },
  "questionPaperOfClass": { type: String, required: false },
  
  // Add a specific field for each question type
  // This tells Mongoose that these fields are expected and should be saved
  // The schema is still flexible with strict:false, but this adds clarity
  
  // Example fields for question formats like q1a, q1b, etc.
  // MongoDB will still accept any field starting with q due to strict:false
  "q1a": { type: Number },
  "q1b": { type: Number },
  "q1a.i": { type: Number },
  "q1a.ii": { type: Number },
  "q1_subcount": { type: Number },
  "q1_marks_per_sub": { type: Number },
  "q1a_has_subparts": { type: Boolean },
  "q1a_subparts_count": { type: Number },
  "q1a_marks_per_subpart": { type: Number }
  
},{strict:false})
const classSchema = new mongoose.Schema({

  
"studentClass":{ type: String,required: false},
  "section":{ type: String,required: false},

})
const terminalSchema = new mongoose.Schema({

  "terminal":{ type: String,required: false},

})

const studentrecordschema = new mongoose.Schema({
  "reg": { type: String, required: false },
  "name":{ type: String,required: false},
  "studentClass":{ type: String,required: false},
  "section":{ type: String,required: false},
  "roll":{ type: Number,required: false},
})
const newsubjectSchema = new mongoose.Schema({
  "subject":{ type: String,required: false},
  "forClass":{ type: String,required: false},
  "theory":{ type: Number,required: false},
  "practical":{ type: Number,required: false},
  "total":{ type: Number,required: false},
  "passingMarks":{ type: Number,required: false},

},{strict:false})
module.exports = {subjectSchema,classSchema,terminalSchema,studentrecordschema,newsubjectSchema};
