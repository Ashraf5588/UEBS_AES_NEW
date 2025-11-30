const path = require("path");

const fs= require("fs");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { rootDir } = require("../utils/path");
const { studentSchema } = require("../model/schema");
const { studentrecordschema } = require("../model/adminschema");
const { classSchema, subjectSchema,terminalSchema,newsubjectSchema } = require("../model/adminschema");
const {examSchema}= require("../model/examschema");
const { name } = require("ejs");
const subjectlist = mongoose.model("subjectlist", subjectSchema, "subjectlist");
const studentClass = mongoose.model("studentClass", classSchema, "classlist");
const studentClassModel = mongoose.model("studentClass", classSchema, "classlist");
const studentRecord = mongoose.model("studentRecord", studentrecordschema, "studentrecord");
const bcrypt = require("bcrypt");
const terminal = mongoose.model("terminal", terminalSchema, "terminal");
const terminalModel = mongoose.model("terminal", terminalSchema, "terminal");
app.set("view engine", "ejs");
app.set("view", path.join(rootDir, "views"));
const newsubject = mongoose.model("newsubject", newsubjectSchema, "newsubject");
const getSlipModel = (studentClass, section, academicYear) => {
  // to Check if model already exists
  if (mongoose.models[`exam_${studentClass}_${section}_${academicYear}`]) {
    return mongoose.models[`exam_${studentClass}_${section}_${academicYear}`];
  }
  return mongoose.model(`exam_${studentClass}_${section}_${academicYear}`, examSchema, `exam_${studentClass}_${section}_${academicYear}`);
};


exports.examManagement = async (req, res, next) => {
  try {
    res.render("./exam/examdashboard", { 
      currentPage: "exammanagement",
      user: req.user
    });
  }catch (error) {
    console.error("Error loading exam management page:", error);
    res.status(500).send("Internal Server Error");
  }
}
exports.formatChoose = async (req, res, next) => {
  try {
    res.render("./exam/formatchoose", {
      currentPage: "exammanagement",
      user: req.user
    });
  } catch (error) {
    console.error("Error loading format choose page:", error);
    res.status(500).send("Internal Server Error");
  }
}
exports.generateMarksheet = async (req, res, next) => {
  try {
   const {studentClass,section,terminal,academicYear,format} = req.query;
    const studentClassdata = await studentClassModel.find({}).lean();
    const terminals = await terminalModel.find({}).lean();
    const user = req.user;

    const model = getSlipModel(studentClass, section, academicYear);
  
  const studentWisedata = await model.aggregate([
  {
    $match: {
      terminal: terminal   // ← filter by terminal
    }
  },
  {
    $group: {
      _id: "$reg",
      name: { $first: "$name" },
      roll: { $first: "$roll" },
      terminal: { $first: "$terminal" }, // optional
      subjects: {
        $push: {
          subject: "$subject",
          attendance: "$attendance",
          theorymarks: "$theorymarks",
          practicalmarks: "$totalpracticalmarks",
          theoryfullmarks: "$theoryfullmarks",
          passMarks: "$passMarks",
          practicalfullmarks: "$practicalfullmarks",
          creditHour: "$creditHour",
        }
      }
    }
  },
  {
    $sort: { roll: 1 }  // optional: sort students by roll
  }
])

console.log("grouped data",studentWisedata);
   if(format=="theorypractical")
   {
    res.render("./exam/generatemarksheettheorypr", {
      currentPage: "exammanagement",

            studentClassdata:studentClassdata,
            terminals,
            format,
            studentWisedata,
            studentClass,
            section,
            terminal,
            academicYear,
           
      user: req.user
    });
  }
  else if(format=="practicalonly")
  {
    res.render("./exam/generatemarksheetpronly", {
      currentPage: "exammanagement",
      studentClassdata:studentClassdata,
      terminals,
      format,
      user: req.user
    });
  } 
  else if(format=="internalexternal")
  {
    res.render("./exam/generatemarksheetinternalexternal", {
      currentPage: "exammanagement",
      studentClassdata:studentClassdata,
      terminals,
      format,
      user: req.user
    });
  }
  }
  catch (error) {
    console.error("Error loading generate marksheet page:", error);
    res.status(500).send("Internal Server Error");
  }
}
