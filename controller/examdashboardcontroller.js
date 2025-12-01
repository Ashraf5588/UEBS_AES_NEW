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
const routineModel = mongoose.model("routine", routineSchema, "routine");
const marksheetSetup = mongoose.model("marksheetSetup", marksheetsetupschemaForAdmin, "marksheetSetup");
app.set("view engine", "ejs");
app.set("view", path.join(rootDir, "views"));
const newsubject = mongoose.model("newsubject", newsubjectSchema, "newsubject");
const getSlipModel = () => {
  // to Check if model already exists
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
      examRoutines
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
    const { studentClass, section, academicYear, terminal } = req.query;
    await routineModel.create(req.body);
    res.redirect(`/examroutine?studentClass=${req.body.studentClass}&academicYear=${req.body.academicYear}&terminal=${req.body.terminal}`);
  } catch (error) {
    console.error("Error saving exam routine:", error);
    res.status(500).send("Internal Server Error");
  }
}
exports.analytics = async (req, res, next) => {
  try{
    const {terminal,studentClass,section,academicYear} = req.query;
    model = getSlipModel();
    const analysisdata =await model.aggregate([
  {
    $group: {
      _id: "$studentClass",
      passCount: {
        $sum: { $cond: [{ $gte: ["$total", "$passMarks"] }, 1, 0] }
      },
      failCount: {
        $sum: { $cond: [{ $lt: ["$total", "$passMarks"] }, 1, 0] }
      }
    }
  }
]);
console.log("analysis data",analysisdata);


res.render("./exam/analytics", {
      currentPage: "exammanagement",
      user: req.user
    });
  }catch(err)
  {
    res.status(500).send("Internal Server Error");
    console.error("Error loading analytics page:", err);
  }
}
