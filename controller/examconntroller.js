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
const { marksheetsetupschemaForAdmin } = require("../model/marksheetschema");
const marksheetSetup = mongoose.model("marksheetSetup", marksheetsetupschemaForAdmin, "marksheetSetup");
const getSlipModel = () => {
  // to Check if model already exists
  if (mongoose.models[`exam_marks`]) {
    return mongoose.models[`exam_marks`];
  }
  return mongoose.model(`exam_marks`, examSchema, `exam_marks`);
};

exports.loadForm = async (req,res,next)=>
{
    const subject = await newsubject.find({}).lean();
    const studentClassdata = await studentClass.find({}).lean();
 
    const user = req.user;
    let accessibleSubject =[];
    let accessibleClass=[];
    if(user.role==="ADMIN")
    {
      accessibleSubject = subject;
      accessibleClass = studentClassdata;
    }
    else
    {
     accessibleSubject = subject.filter(subject =>
        user.allowedSubjects.some(allowed =>
          allowed.subject === subject.newsubject
        )
      );
      accessibleClass = studentClassdata.filter(studentclass =>
        user.allowedSubjects.some(allowed =>
          allowed.studentClass === studentclass.studentClass &  allowed.section === studentclass.section
        )
      );
    }
   const marksheetSetups = await marksheetSetup.find({}).lean();
    res.render("./exam/formloader", { 
      currentPage: "home",
      subjects: accessibleSubject, 
      studentClassdata:accessibleClass,
  
      marksheetSetups,
    });

}
exports.entryform = async (req,res,next)=>

{
   const studentClassdata = await studentClassModel.find({}).lean();
  const {studentClass,section,subject,academicYear,terminal}= req.query;
  const studentData = await studentRecord.find({studentClass:studentClass,section:section})
     const marksheetSetups = await marksheetSetup.find({}).lean();
     console.log("studentData",studentData);
  const subjectData = await newsubject.find({forClass:studentClass,newsubject:subject}).lean();
 
  const subjects = await newsubject.find({}).lean();
  const terminals = await terminalModel.find({}).lean();
  if(studentClass>3)
  {

  res.render("./exam/entryform",{studentData,studentClass,section,subject,academicYear,terminal,subjectData,subjects,studentClassdata,terminals, marksheetSetups});
  }
  else if (studentClass<=3)
  {
    res.render("./exam/entryformprimary",{studentData,studentClass,section,subject,academicYear,terminal,subjectData,subjects,studentClassdata,terminals, marksheetSetups});
  }
 
}
exports.saveEntryform = async (req, res, next) => {
  try {
    const { studentClass, section, subject, academicYear, terminal } = req.query;

    const model = getSlipModel();

    const bulkOps = [];

    for (let key of Object.keys(req.body.reg)) {
      const reg = req.body.reg[key];

      bulkOps.push({
        updateOne: {
          filter: {
            reg: reg,
            subject: subject,
            terminal: terminal,
            
          },
          update: {
            $set: {
              roll: req.body.roll[key],
              name: req.body.name[key],
              theorymarks: Number(req.body.theorymarks[key]) || 0,
              practicalmarks: Number(req.body.practicalmarks[key]) || 0,
              totalpracticalmarks: Number(req.body.totalpracticalmarks[key]) || 0,
              attendance: Number(req.body.attendance[key]) || 0,
              terminal: terminal,
              subject: subject,
              theoryfullmarks: Number(req.body.theoryfullmarks) || 0,
              passMarks: Number(req.body.passMarks) || 0,
              practicalfullmarks: Number(req.body.practicalfullmarks) || 0,
              studentClass: studentClass,
              section: section,
              academicYear: academicYear,
              gender: req.body.gender[key] || "",

            }
          },
          upsert: true
        }
      });
    }

    await model.bulkWrite(bulkOps);

    res.redirect(`/entryform?studentClass=${studentClass}&section=${section}&subject=${subject}&academicYear=${academicYear}&terminal=${terminal}`);
  } 
  catch (err) {
    console.error("Error saving entry form:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getPreviousmarks= async (req,res,next)=>
{
  try{
    const {subject,studentClass,section,academicYear,terminal}= req.query;
    const model = getSlipModel();
    const previousMarks = await model.find({subject:subject,terminal:terminal,studentClass:studentClass,section:section,academicYear:academicYear}).lean();

    res.json(previousMarks);
  }
  catch(err)
  {
    console.error("Error fetching previous marks:", err);
    res.status(500).json({error:"Internal Server Error"});
  }
}
exports.getAttendanceData= async (req,res,next)=>
{
  try{
    const {studentClass,section,academicYear,terminal}= req.query;
    const attendanceModel = getSlipModel();
    const attendanceData = await attendanceModel.find({terminal:terminal,studentClass:studentClass,section:section,academicYear:academicYear}).lean();
    res.json(attendanceData);
  }
  catch(err)
  {
    console.error("Error fetching attendance data:", err);
    res.status(500).json({error:"Internal Server Error"});
  }
}