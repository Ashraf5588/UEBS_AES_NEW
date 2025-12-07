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
const { marksheetsetupschemaForAdmin ,routineSchema} = require("../model/marksheetschema");
const { fail } = require("assert");
const routineModel = mongoose.model("routine", routineSchema, "routine");
const marksheetSetup = mongoose.model("marksheetSetup", marksheetsetupschemaForAdmin, "marksheetSetup");
app.set("view engine", "ejs");
app.set("view", path.join(rootDir, "views"));
const newsubject = mongoose.model("newsubject", newsubjectSchema, "newsubject");
const getSlipModel = () => {
 
  if (mongoose.models[`exam_marks`]) {
    return mongoose.models[`exam_marks`];
  }
  return mongoose.model(`exam_marks`, examSchema, `exam_marks`);
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
    const creditHourData = await newsubject.find({ forClass: studentClass }).lean();
       const marksheetSetups = await marksheetSetup.find({}).lean();
    console.log("credit hour data",creditHourData);
   
    const user = req.user;

    const model = getSlipModel();
  
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
            creditHourData,
            marksheetSetups,
           
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
            studentWisedata,
            studentClass,
            section,
            terminal,
            academicYear,
            creditHourData,
            marksheetSetups,
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
  else if(format=="theoryonly")
   {
    res.render("./exam/generatemarksheettheoryonly", {
      currentPage: "exammanagement",

            studentClassdata:studentClassdata,
            terminals,
            format,
            studentWisedata,
            studentClass,
            section,
            terminal,
            academicYear,
            creditHourData,
            marksheetSetups,
           
      user: req.user
    });
  }
  }
  catch (error) {
    console.error("Error loading generate marksheet page:", error);
    res.status(500).send("Internal Server Error");
  }
}

exports.marksheetSetup = async (req, res, next) => {
  try {
    res.render("./exam/marksheetsetup", {
      currentPage: "exammanagement",
      user: req.user
    });
  }
    catch (error) {
    console.error("Error loading marksheet setup page:", error);
    res.status(500).send("Internal Server Error");
  }
}

exports.saveMarksheetSetup = async (req, res) => {
  try {
    const total = req.body.totalTerminals;
    const terminals = [];

    for (let i = 1; i <= total; i++) {
      const name = req.body[`name${i}`];
      const workingDays = req.body[`workingDays${i}`];

      if (name && workingDays) {
        terminals.push({ name, workingDays });
      }
    }

    // Check if we're updating an existing setup
    if (req.query.edit === 'true' && req.query.id) {
      // Update existing setup
      await marksheetSetup.findByIdAndUpdate(req.query.id, {
        schoolName: req.body.schoolName,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        website: req.body.website,
        academicYear: req.body.academicYear,
        totalTerminals: total,
        terminals
      });
    } else {
      // Create new setup
      await marksheetSetup.create({
        schoolName: req.body.schoolName,
        address: req.body.address,
        phone: req.body.phone,
        email: req.body.email,
        website: req.body.website,
        academicYear: req.body.academicYear,
        totalTerminals: total,
        terminals
      });
    }

    res.redirect('/marksheetsetup');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving marksheet setup");
  }
};
exports.deletemarksheetSetup = async (req, res) => {
  try {
    const { id } = req.params;
    await marksheetSetup.findByIdAndDelete(id);
    res.redirect('/marksheetsetup');
  } catch (err) {
    console.error("Error deleting marksheet setup:", err);
    res.status(500).send("Error deleting marksheet setup: " + err.message);
  }
};

exports.admitCard = async (req, res, next) => {
  try {
    const {studentClass,section,terminal,academicYear} = req.query;

    const studentClassdata = await studentClassModel.find({}).lean();
       const marksheetSetups = await marksheetSetup.find({}).lean();
       const studentRecords = await studentRecord.find({ studentClass: studentClass}).lean();
       const examRoutines = await routineModel.find({ studentClass: studentClass, terminal: terminal}).lean();
       console.log("Exam Routines:", examRoutines);
    res.render("./exam/admitcard", {
      currentPage: "exammanagement",
      studentClassdata:studentClassdata,
      marksheetSetups,
      studentRecords,
      user: req.user,
      examRoutines,
      terminal,academicYear,studentClass,section
    });
  
  } catch (error) {
    console.error("Error loading admit card page:", error);
    res.status(500).send("Internal Server Error");
  }
}

exports.examRoutine = async (req, res, next) => {
  try {
    const {studentClass,section,academicYear,terminal} = req.query;
    const studentClassdata = await studentClassModel.find({}).lean();
    const subjectData = await newsubject.find({}).lean();
       const marksheetSetups = await marksheetSetup.find({}).lean();
       const examRoutines = await routineModel.find();
         res.render("./exam/examroutine", {
      currentPage: "exammanagement",
      studentClassdata,
      marksheetSetups,
      user: req.user,
      academicYear,studentClass,section,
      subjectData,
      terminal,
      examRoutines,
      editing:false,
    });
       
  } catch (error) {
    console.error("Error loading exam routine page:", error);
    res.status(500).send("Internal Server Error");
  } 

}
exports.routineTerminalChoose = async (req, res, next) => {
  try {
    const marksheetSetups = await marksheetSetup.find({}).lean();
    res.render("./exam/routineterminalchoose", {  
      currentPage: "exammanagement",
      user: req.user,
      marksheetSetups
    });
  } catch (error) {
    console.error("Error loading routine terminal choose page:", error);
    res.status(500).send("Internal Server Error");
  }
}
exports.saveExamRoutine = async (req, res, next) => {
  try {
    const { studentClass, section, academicYear, terminal,routineId,editing } = req.query;
    if(routineId && editing==="true")
    {
      await routineModel.findByIdAndUpdate(routineId, req.body);
      return res.redirect(`/examroutine?studentClass=${studentClass}&academicYear=${academicYear}&terminal=${terminal}`);
    }
    else
    {

    
    await routineModel.create(req.body);
    res.redirect(`/examroutine?studentClass=${req.body.studentClass}&academicYear=${req.body.academicYear}&terminal=${req.body.terminal}`);
    }
  } catch (error) {
    console.error("Error saving exam routine:", error);
    res.status(500).send("Internal Server Error");
  }
}
exports.analytics = async (req, res, next) => {
  try{

    const {terminal,studentClass,section,academicYear,subject} = req.query;
    const studentClassdata = await studentClassModel.find({}).lean();
    const marksheetSetups = await marksheetSetup.find({}).lean();
      const subjects = await newsubject.find({}).lean();
    const model = getSlipModel();
    const matchStage = {};
    if (academicYear) {
      matchStage.academicYear = academicYear;
    }
    if (terminal) {
      matchStage.terminal = terminal;
    }
    if (studentClass) {
      matchStage.studentClass = studentClass;
    }
    if (section) {
      matchStage.section = section;
    }
    if(subject)
    {
      matchStage.subject= subject;
    }
    
    // 1. Class-wise Subject Analysis
    const classSubjectAnalysis = await model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { studentClass: "$studentClass", subject: "$subject", terminal: "$terminal" },
          totalStudents: { $sum: 1 },
          pass: { $sum: { $cond: [{ $gte: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          fail: { $sum: { $cond: [{ $lt: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          avgMarks: { $avg: { $add: ["$theorymarks", "$practicalmarks"] } }
        }
      },
      { $sort: { "_id.studentClass": 1, "_id.subject": 1 } }
    ]);

    // 2. Section-wise Analysis
    const sectionAnalysis = await model.aggregate([

      { $match: matchStage },
      {
        $group: {
          _id: { studentClass: "$studentClass", section: "$section", subject: "$subject", terminal: "$terminal" , academicYear: "$academicYear"},
          totalStudents: { $sum: 1 },
          pass: { $sum: { $cond: [{ $gte: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          fail: { $sum: { $cond: [{ $lt: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          avgMarks: { $avg: { $add: ["$theorymarks", "$practicalmarks"] } },
          highestMarks: {$max: "$theorymarks"},
          lowestMarks: {$min: "$theorymarks"},
          medianMarks : {$median:{input:"$theorymarks",method:"approximate"}},

        }
      },
  
      { $sort: { "_id.studentClass": 1, "_id.section": 1 ,fail: -1} },
      
    ]);
const finalStructureSectionAnalysis = {};
 for (const item of sectionAnalysis) {
  const studentClass= item._id.studentClass;
  const section = item._id.section;
  const subject = item._id.subject;
  const studentClassSection = `${studentClass}-${section}`;
  const terminal = item._id.terminal;
  const academicYear = item._id.academicYear;
  if (!finalStructureSectionAnalysis[academicYear]) {
    finalStructureSectionAnalysis[academicYear] = {};
  }
  if (!finalStructureSectionAnalysis[academicYear][terminal]) {
    finalStructureSectionAnalysis[academicYear][terminal] = {};
  }
   if (!finalStructureSectionAnalysis[academicYear][terminal][studentClassSection]) finalStructureSectionAnalysis[academicYear][terminal][studentClassSection] = [];

    finalStructureSectionAnalysis[academicYear][terminal][studentClassSection].push(item);
 
 }
 
    // 3. Subject-wise Average across all classes
    const subjectAnalysis = await model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { subject: "$subject", terminal: "$terminal", academicYear: "$academicYear",studentClass: "$studentClass" ,section: "$section" },
          totalStudents: { $sum: 1 },
          avgTheory: { $avg: "$theorymarks" },
          avgPractical: { $avg: "$practicalmarks" },
          avgTotal: { $avg: { $add: ["$theorymarks", "$practicalmarks"] } },
          pass: { $sum: { $cond: [{ $gte: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          fail: { $sum: { $cond: [{ $lt: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          highestMarkstheory: {$max:"$theorymarks"},
          lowestMarkstheory: {$min:"$theorymarks"},
          medianMarkstheory : {$median:{input:"$theorymarks",method:"approximate"}},
          highestMarkspractical: {$max:"$practicalmarks"},
          lowestMarkspractical: {$min:"$practicalmarks"},
          medianMarkspractical : {$median:{input:"$practicalmarks",method:"approximate"}},
          highestMarkstotal: {$max: { $add: ["$theorymarks", "$practicalmarks"] }},
          lowestMarkstotal: {$min: { $add: ["$theorymarks", "$practicalmarks"] }},
          medianMarkstotal : {$median:{input: { $add: ["$theorymarks", "$practicalmarks"] },method:"approximate"}},
          theroryFullMarks: {$first:"$theoryfullmarks"},
          practicalFullMarks: {$first:"$practicalfullmarks"},
          range1theory: { $sum:{
            $cond: [{$and: [{$gte: ["$theorymarks",0]}, {$lte: ["$theorymarks", { $multiply: [0.2, "$theoryfullmarks"] }]}]}, 1, 0],
          
          }},
          range2theory:{ $sum:{
            $cond: [{$and: [{$gte: ["$theorymarks", { $add: [ { $multiply: [0.2, "$theoryfullmarks"] }, 1 ] }]}, {$lte: ["$theorymarks", { $multiply: [0.4, "$theoryfullmarks"] }]}]}, 1, 0],
          }},
          range3theory: {$sum:{
            $cond: [{$and: [{$gte: ["$theorymarks", { $add: [ { $multiply: [0.4, "$theoryfullmarks"] }, 1 ] }]}, {$lte: ["$theorymarks", { $multiply: [0.6, "$theoryfullmarks"] }]}]}, 1, 0],
          }},
          range4theory: {$sum:{
            $cond: [{$and: [{$gte: ["$theorymarks", { $add: [ { $multiply: [0.6, "$theoryfullmarks"] }, 1 ] }]}, {$lte: ["$theorymarks", { $multiply: [0.8, "$theoryfullmarks"] }]}]}, 1, 0],
          }},
          range5theory: {$sum:{
            $cond: [{$and: [{$gte: ["$theorymarks", { $add: [ { $multiply: [0.8, "$theoryfullmarks"] }, 1 ] }]}, {$lte: ["$theorymarks", "$theoryfullmarks"]}]}, 1, 0],
          }},

        }
      },
      { $sort: { "_id.subject": 1 } }
    ]);
const subjectAnalysisFinalStructure = {};
  for (const item of subjectAnalysis) {
    const subject = item._id.subject;
    const terminal = item._id.terminal;
    const academicYear = item._id.academicYear;
    const studentClass = item._id.studentClass;
    const section = item._id.section;
    if (!subjectAnalysisFinalStructure[academicYear]) {
      subjectAnalysisFinalStructure[academicYear] = {};
    }
    if (!subjectAnalysisFinalStructure[academicYear][terminal]) {
      subjectAnalysisFinalStructure[academicYear][terminal] = {};
    }
    if (!subjectAnalysisFinalStructure[academicYear][terminal][subject]) {
      subjectAnalysisFinalStructure[academicYear][terminal][subject] = [];
    }
    subjectAnalysisFinalStructure[academicYear][terminal][subject].push(item);
  }

    // 4. Whole School Overview
    const schoolOverview = await model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { terminal: "$terminal" ,academicYear:"$academicYear",studentClass:"$studentClass",subject:"$subject"},
          totalStudents: { $sum: 1 },
          passtheory: { $sum: { $cond: [{ $gte: ["$theorymarks", "$passMarks"] }, 1, 0] } },
          failtheory: { $sum: { $cond: [{ $lt: ["$theorymarks", "$passMarks"] }, 1, 0] } },
          passpractical: { $sum: { $cond: [{ $gte: ["$practicalmarks", "$passMarks"] }, 1, 0] } },
          failpractical: { $sum: { $cond: [{ $lt: ["$practicalmarks", "$passMarks"] }, 1, 0] } },
         
        }
      },
      { $sort: { "_id.terminal": 1 } }
    ]);

const schoolOverviewFinalStructure = {};
  for (const item of schoolOverview) {
    const terminal = item._id.terminal;
    const academicYear = item._id.academicYear;
    const studentClass = item._id.studentClass;
    const subject = item._id.subject;
    if (!schoolOverviewFinalStructure[academicYear]) {
      schoolOverviewFinalStructure[academicYear] = {};
    }
    if (!schoolOverviewFinalStructure[academicYear][terminal]) {
      schoolOverviewFinalStructure[academicYear][terminal] = {};
    }
   if (!schoolOverviewFinalStructure[academicYear][terminal][studentClass]) {
      schoolOverviewFinalStructure[academicYear][terminal][studentClass] = [];
    }
    schoolOverviewFinalStructure[academicYear][terminal][studentClass].push(item) ;
  }

    // 5. Terminal Comparison
    const terminalComparison = await model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { subject: "$subject", terminal: "$terminal", academicYear: "$academicYear", studentClass: "$studentClass" , section: "$section" },
          totalStudents: { $sum: 1 },
          passtheory: { $sum: { $cond: [{ $gte: ["$theorymarks", "$passMarks"] }, 1, 0] } },
          failtheory: { $sum: { $cond: [{ $lt: ["$theorymarks", "$passMarks"] }, 1, 0] } },
          passpractical: { $sum: { $cond: [{ $gte: ["$practicalmarks", "$passMarks"] }, 1, 0] } },
          failpractical: { $sum: { $cond: [{ $lt: ["$practicalmarks", "$passMarks"] }, 1, 0] } },
          avgMarks: { $avg: { $add: ["$theorymarks", "$practicalmarks"] } }
        }
      },
      { $sort: { "_id.subject": 1, "_id.terminal": 1,"_id.academicYear": 1 } }
    ]);
   const terminalComparisonFinalStructure = {};

 for (const item of terminalComparison) {
  const studentClass= item._id.studentClass;
  const section = item._id.section;
  const subject = item._id.subject;
  const studentClassSection = `${studentClass}-${section}`;
  const terminal = item._id.terminal;
  const academicYear = item._id.academicYear;
  if (!terminalComparisonFinalStructure[academicYear]) {
    terminalComparisonFinalStructure[academicYear] = {};
  }
  if (!terminalComparisonFinalStructure[academicYear][terminal]) {
    terminalComparisonFinalStructure[academicYear][terminal] = {};
  }
   if (!terminalComparisonFinalStructure[academicYear][terminal][studentClassSection]) terminalComparisonFinalStructure[academicYear][terminal][studentClassSection] = [];

    terminalComparisonFinalStructure[academicYear][terminal][studentClassSection].push(item);
 
 }
 console.log("Terminal Comparison:", terminalComparisonFinalStructure);
 
    // 6. Year-wise Trend (for multiple years)
    const yearTrend = await model.aggregate([
      {
        $group: {
          _id: { subject: "$subject", academicYear: "$academicYear", terminal: "$terminal" },
          totalStudents: { $sum: 1 },
          pass: { $sum: { $cond: [{ $gte: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          fail: { $sum: { $cond: [{ $lt: [{ $add: ["$theorymarks", "$practicalmarks"] }, "$passMarks"] }, 1, 0] } },
          avgMarks: { $avg: { $add: ["$theorymarks", "$practicalmarks"] } }
        }
      },
      { $sort: { "_id.academicYear": 1, "_id.subject": 1, "_id.terminal": 1 } }
    ]);

 
    console.log("School Overview:", schoolOverview);

    res.render("./exam/analytics", {
      currentPage: "exammanagement",
      user: req.user,
      classSubjectAnalysis,
      schoolOverview,
      terminalComparison,
      yearTrend,
      academicYear: academicYear || 'All Years',
      studentClassdata,
      marksheetSetups,
      subjects,
      finalStructureSectionAnalysis,
      subjectAnalysisFinalStructure,
      terminalComparisonFinalStructure,
    });
  
}catch(err)
  {
    res.status(500).send("Internal Server Error");
    console.error("Error loading analytics page:", err);
  }

};
exports.editRoutine = async (req, res, next) => {

  try{
const {editing,routineId,terminal,academicYear,subject} = req.query;
  const routineData = await routineModel.findById(routineId).lean();
  console.log("Routine Data to Edit:", routineData);
  const studentClassdata = await studentClassModel.find({}).lean();
    const subjectData = await newsubject.find({}).lean();
       const marksheetSetups = await marksheetSetup.find({}).lean();
       const examRoutines = await routineModel.find();
    res.render("./exam/examroutine", {
      currentPage: "exammanagement",
      user: req.user,
      editing,
      routineData,
      terminal,
      academicYear,
      studentClassdata,
      marksheetSetups,
      subjectData,
      examRoutines,
      subject,
    });
  }catch(err)
  {
    res.status(500).send("Internal Server Error");
    console.error("Error loading edit routine page:", err);

  }
}
exports.deleteRoutine = async (req, res, next) => {

  try{
const {routineId,terminal,academicYear} = req.query;
  await routineModel.findByIdAndDelete(routineId);
  res.redirect(`/examroutine?studentClass=&academicYear=${academicYear}&terminal=${terminal}`);
  }catch(err)
  {
    res.status(500).send("Internal Server Error");
    console.error("Error deleting routine:", err);
  }
}