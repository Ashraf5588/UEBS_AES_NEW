const path = require("path");
const multer  = require('multer')
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
const {onlineAttendanceSchema} = require("../model/onlineattendanceschema");
const onlineAttendance = mongoose.model("onlineAttendance", onlineAttendanceSchema, "onlineAttendance");
const {holidaySchema} = require("../model/holidayschema");
const holiday = mongoose.model("holiday", holidaySchema, "holiday");
const bs = require('bikram-sambat-js');
const getSidenavData = async (req) => {
  try {
    const subjects = await subjectlist.find({}).lean();
    const studentClassdata = await studentClass.find({}).lean();
    const terminals = await terminal.find({}).lean();
    
    let accessibleSubject = [];
    let accessibleClass = [];
    
    // Check if req exists and has user property
    if (req && req.user) {
      const user = req.user;
      // Log user info for debugging
      if (user && user.role) {
        console.log('User role:', user.role);
        console.log('User allowed subjects:', user.allowedSubjects || []);
      } else {
        console.log('User object exists but missing role or allowedSubjects');
      }
      
      if (user.role === "ADMIN") {
        accessibleSubject = subjects;
        accessibleClass = studentClassdata;
      } else {
        // Filter subjects based on user's allowed subjects
        accessibleSubject = subjects.filter(subj =>
          user.allowedSubjects && user.allowedSubjects.some(allowed =>
            allowed.subject === subj.subject
          )
        );
        
        // Filter classes based on user's allowed classes/sections
        accessibleClass = studentClassdata.filter(classItem =>
          user.allowedSubjects && user.allowedSubjects.some(allowed =>
            allowed.studentClass === classItem.studentClass && 
            allowed.section === classItem.section
          )
        );
        
        console.log('Filtered subjects:', accessibleSubject.length);
        console.log('Filtered classes:', accessibleClass.length);
      }
    } else {
      // If no user is found, return all data (default admin view)
      console.log('No user found in request, returning all data');
      accessibleSubject = subjects;
      accessibleClass = studentClassdata;
    }
    
    return {
      subjects: accessibleSubject,
      studentClassdata: accessibleClass,
      terminals
    };
  } catch (error) {
    console.error('Error fetching sidenav data:', error);
    return {
      subjects: [],
      studentClassdata: [],
      terminals: []
    };
  }
};

const BS_MONTH_NAMES = {
  1: 'Baisakh',
  2: 'Jestha',
  3: 'Asar',
  4: 'Shrawan',
  5: 'Bhadra',
  6: 'Ashwin',
  7: 'Kartik',
  8: 'Mangsir',
  9: 'Poush',
  10: 'Magh',
  11: 'Falgun',
  12: 'Chaitra'
};

const MONTH_EQUIVALENTS = {
  Asar: ['Asar', 'Ashar', 'Ashadh'],
  Ashwin: ['Ashwin', 'Ashoj']
};

const BS_MONTH_ORDER = {
  baisakh: 1,
  jestha: 2,
  asar: 3,
  ashar: 3,
  ashadh: 3,
  shrawan: 4,
  bhadra: 5,
  ashwin: 6,
  ashoj: 6,
  kartik: 7,
  mangsir: 8,
  poush: 9,
  magh: 10,
  falgun: 11,
  chaitra: 12
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getBsMonthOrder = (monthName) => {
  return BS_MONTH_ORDER[normalizeText(monthName)] || 0;
};

const getMonthVariants = (monthName) => {
  if (!monthName) {
    return [];
  }

  const aliases = MONTH_EQUIVALENTS[monthName] || [monthName];
  return aliases.map((name) => normalizeText(name));
};

const getPreferredContact = (student) => {
  return (
    (student && student.numberofmobile) ||
    (student && student.fatherContact) ||
    (student && student.motherContact) ||
    (student && student.otherguardianContact) ||
    ''
  );
};

const toDialableNumber = (value) => String(value || '').replace(/[^\d+]/g, '');


exports.onlineAttendancePage = async (req, res) => {
    try {
        const {studentClass,section,academicYear,month}= req.query;
    const todayBs = String(bs.ADToBS(new Date()) || '');
    const [todayYearPart, todayMonthPart, todayDayPart] = todayBs.split('-');
    const todayYear = String(todayYearPart || '');
    const todayDay = Number.parseInt(todayDayPart, 10);
    const todayMonthNumber = Number.parseInt(todayMonthPart, 10);
    const todayMonthName = BS_MONTH_NAMES[todayMonthNumber] || '';
    const todayMonthVariants = getMonthVariants(todayMonthName);
        const studentData = await studentRecord.find({ studentClass: studentClass, section: section });

     
        const sidenavData = await getSidenavData(req);
        const marksheetSetups = await marksheetSetup.find({}).lean();
        const HolidayData = await holiday.find({ academicYear: academicYear }).lean();
        const selectedMonthVariants = getMonthVariants(month);
        const onlineAttendanceData = (studentClass && section && academicYear)
          ? await onlineAttendance.find({ studentClass, section, academicYear }).lean()
          : [];

        const absentHistory = [];
        onlineAttendanceData.forEach((student) => {
          const attendanceEntries = Array.isArray(student && student.attendance) ? student.attendance : [];
          attendanceEntries.forEach((entry) => {
            const entryYear = String(entry && entry.academicYear || '');
            const entryMonth = normalizeText(entry && entry.month);
            const entryDay = Number.parseInt(entry && entry.day, 10);
            const entryStatus = normalizeText(entry && entry.status);
            const isSameAcademicYear = entryYear === String(academicYear || '');
            const isSameSelectedMonth = selectedMonthVariants.length > 0
              ? selectedMonthVariants.includes(entryMonth)
              : true;
            const isAbsent = entryStatus === 'absent' || entryStatus === 'a' || entryStatus === 'false';

            if (!isSameAcademicYear || !isSameSelectedMonth || !isAbsent) {
              return;
            }

            const year = Number.parseInt(entryYear, 10) || 0;
            const monthOrder = getBsMonthOrder(entry && entry.month);
            const day = Number.parseInt(entryDay, 10) || 0;
            const sortValue = (year * 10000) + (monthOrder * 100) + day;

            absentHistory.push({
              studentName: String(student && student.name || ''),
              dateText: `${String(entry && entry.day || '')} ${String(entry && entry.month || '')}, ${String(entry && entry.academicYear || '')}`,
              reason: String(entry && entry.reason || '').trim(),
              sortValue
            });
          });
        });

        absentHistory.sort((a, b) => b.sortValue - a.sortValue);

        console.log('Holiday Data:', HolidayData[0]);
        res.render('./attendance/attendance', { studentClass,section,academicYear, 
          studentData : studentData  || { students: [] }
          , marksheetSetups,studentClassdata:sidenavData.studentClassdata,month,
          HolidayData: HolidayData[0] || null,
          absentHistory,
          todayBs,
          todayMonthName });

    } catch (error) {
        console.error('Error fetching attendance page:', error);
        res.status(500).send('Internal Server Error');
    } 
}
exports.saveOnlineAttendance = async (req, res) => {
    try {   
        const {studentClass,section,academicYear}= req.query;
       const model = onlineAttendance ;
       const day = req.body.day;
       const month = req.body.month;
       const status = req.body.status;
       await model.updateOne(
             {
               reg: req.body.reg,
                 academicYear: academicYear,
               studentClass: studentClass,
               section: section,
             },
             {
               $set: {
                 reg: req.body.reg,
                 roll:  req.body.roll,
                 name: req.body.name,
                 studentClass: studentClass,
                 section: section,
                 academicYear: academicYear,
                 gender: req.body.gender || "",
               },
             },
             { upsert: true }
           );

       if (day && month && academicYear) {
         const existingDoc = await model.findOne(
           {
             reg: req.body.reg,
             academicYear: academicYear,
             studentClass: studentClass,
             section: section,
           },
           { attendance: 1 }
         ).lean();

         const previousEntry = (Array.isArray(existingDoc && existingDoc.attendance)
           ? existingDoc.attendance
           : []
         ).find((entry) => (
           String(entry && entry.academicYear) === String(academicYear) &&
           normalizeText(entry && entry.month) === normalizeText(month) &&
           String(entry && entry.day) === String(day)
         ));

         const preservedReason = String(previousEntry && previousEntry.reason || '').trim();

         await model.updateOne(
           {
             reg: req.body.reg,
             academicYear: academicYear,
             studentClass: studentClass,
             section: section,
           },
           {
             $pull: {
               attendance: {
                 academicYear: academicYear,
                 month: month,
                 day: String(day)
               }
             }
           }
         );

         await model.updateOne(
           {
             reg: req.body.reg,
             academicYear: academicYear,
             studentClass: studentClass,
             section: section,
           },
           {
             $push: {
               attendance: {
                 academicYear: academicYear,
                 month: month,
                 day: String(day),
                 status: status === 'absent' ? 'absent' : 'present',
                 reason: status === 'absent' ? preservedReason : ''
               }
             }
           }
         );
       }
            res.json({ success: true });
       
         } 
        
     catch (error) {
        console.error('Error saving online attendance:', error);
        res.status(500).send('Internal Server Error');
    }
}

exports.getOnlineAttendanceData = async (req, res) => {
  try {
    const { studentClass, section, academicYear } = req.query;
    const attendanceData = await onlineAttendance
      .find({ studentClass, section, academicYear })
      .lean();

    res.json(attendanceData);
  } catch (error) {
    console.error('Error fetching online attendance data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

exports.saveFrontdeskReason = async (req, res) => {
  try {
    const { reg, studentClass, section, academicYear, month, day, reason } = req.body;

    if (!reg || !studentClass || !section || !academicYear || !month || !day) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const trimmedReason = String(reason || '').trim();
    const monthVariants = getMonthVariants(month);
    const monthRegex = monthVariants.length > 0
      ? new RegExp(`^(${monthVariants.map((variant) => escapeRegex(variant)).join('|')})$`, 'i')
      : new RegExp(`^${escapeRegex(month)}$`, 'i');

    const updateResult = await onlineAttendance.updateOne(
      {
        reg: String(reg),
        studentClass: String(studentClass),
        section: String(section),
        academicYear: String(academicYear)
      },
      {
        $set: {
          'attendance.$[entry].reason': trimmedReason
        }
      },
      {
        arrayFilters: [
          {
            'entry.academicYear': String(academicYear),
            'entry.day': String(day),
            'entry.month': { $regex: monthRegex },
            'entry.status': { $in: ['absent', 'a', 'false'] }
          }
        ]
      }
    );

    if (!updateResult || updateResult.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Attendance entry not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving frontdesk reason:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

exports.frontdeskPage = async (req, res) => {
  try {
    const todayBs = String(bs.ADToBS(new Date()) || '');
    const [yearPart, monthPart, dayPart] = todayBs.split('-');
    const requestedAcademicYear = String(req.query.academicYear || '').trim();
    const requestedMonth = String(req.query.month || '').trim();
    const requestedDayRaw = String(req.query.day || '').trim();
    const requestedDay = Number.parseInt(requestedDayRaw, 10);
    const currentBsYear = String(yearPart || '');
    let targetAcademicYear = requestedAcademicYear || currentBsYear;
    const todayDay = Number.parseInt(dayPart, 10);
    const monthNumber = Number.parseInt(monthPart, 10);
    const currentMonthName = BS_MONTH_NAMES[monthNumber] || '';
    const selectedMonthName = requestedMonth || currentMonthName;
    const selectedDay = Number.isFinite(requestedDay) ? requestedDay : todayDay;
    const monthVariants = getMonthVariants(selectedMonthName);

    let attendanceDocs = await onlineAttendance.find({
      academicYear: targetAcademicYear
    }).lean();

    // If there is no data in current BS year, fallback to latest available academic year.
    if (!requestedAcademicYear && attendanceDocs.length === 0) {
      const availableYears = await onlineAttendance.distinct('academicYear');
      const sortedYears = (Array.isArray(availableYears) ? availableYears : [])
        .map((year) => String(year || '').trim())
        .filter(Boolean)
        .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));

      if (sortedYears.length > 0) {
        targetAcademicYear = sortedYears[0];
        attendanceDocs = await onlineAttendance.find({
          academicYear: targetAcademicYear
        }).lean();
      }
    }

    const absentCandidates = [];

    attendanceDocs.forEach((doc) => {
      const attendanceEntries = Array.isArray(doc && doc.attendance) ? doc.attendance : [];

      attendanceEntries.forEach((entry) => {
        const entryYear = String(entry && entry.academicYear);
        const entryMonth = normalizeText(entry && entry.month);
        const entryDay = Number.parseInt(entry && entry.day, 10);
        const entryStatus = normalizeText(entry && entry.status);

        const isSameYear = entryYear === targetAcademicYear;
        const isSameMonth = monthVariants.includes(entryMonth);
        const isSameDay = Number.isFinite(selectedDay) && entryDay === selectedDay;
        const isAbsent = entryStatus === 'absent' || entryStatus === 'a' || entryStatus === 'false';

        if (isSameYear && isSameMonth && isSameDay && isAbsent) {
          absentCandidates.push({
            reg: String(doc && doc.reg || ''),
            name: String(doc && doc.name || ''),
            studentClass: String(doc && doc.studentClass || ''),
            section: String(doc && doc.section || ''),
            roll: doc && doc.roll,
            reason: String(entry && entry.reason || '')
          });
        }
      });
    });

    const uniqueByReg = new Map();
    absentCandidates.forEach((student) => {
      if (student.reg && !uniqueByReg.has(student.reg)) {
        uniqueByReg.set(student.reg, student);
      }
    });

    const regs = Array.from(uniqueByReg.keys());
    const studentRecords = regs.length > 0
      ? await studentRecord.find({ reg: { $in: regs } }).lean()
      : [];

    const contactByReg = new Map(
      studentRecords.map((student) => [String(student.reg || ''), getPreferredContact(student)])
    );

    const absentStudents = Array.from(uniqueByReg.values())
      .map((student, index) => {
        const contact = contactByReg.get(student.reg) || '';
        const dialNumber = toDialableNumber(contact);
        return {
          sn: index + 1,
          ...student,
          contact,
          dialNumber
        };
      })
      .sort((a, b) => {
        const classCompare = String(a.studentClass).localeCompare(String(b.studentClass), 'en', { numeric: true });
        if (classCompare !== 0) {
          return classCompare;
        }

        const sectionCompare = String(a.section).localeCompare(String(b.section));
        if (sectionCompare !== 0) {
          return sectionCompare;
        }

        return String(a.roll || '').localeCompare(String(b.roll || ''), 'en', { numeric: true });
      })
      .map((student, index) => ({ ...student, sn: index + 1 }));

    const academicYearOptionsRaw = await onlineAttendance.distinct('academicYear');
    const academicYearOptions = (Array.isArray(academicYearOptionsRaw) ? academicYearOptionsRaw : [])
      .map((year) => String(year || '').trim())
      .filter(Boolean)
      .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));

    if (!academicYearOptions.includes(targetAcademicYear) && targetAcademicYear) {
      academicYearOptions.unshift(targetAcademicYear);
    }

    const monthOptions = Object.keys(BS_MONTH_NAMES).map((monthKey) => BS_MONTH_NAMES[monthKey]);
    const dayOptions = Array.from({ length: 32 }, (_, index) => index + 1);

    res.render('./frontdesk/frontdesk', {
      absentStudents,
      todayBs,
      todayDay: selectedDay,
      currentMonthName: selectedMonthName,
      academicYear: targetAcademicYear,
      academicYearOptions,
      monthOptions,
      dayOptions
    });
  } catch (error) {
    console.error('Error loading frontdesk page:', error);
    res.status(500).send('Internal Server Error');
  }
}

exports.setHoliday = async (req, res) => {
  try {
    const marksheetSetups = await marksheetSetup.find({}).lean();
    const oldHolidayData = await holiday.find({ academicYear: req.query.academicYear }).lean();
    console.log('Old Holiday Data:', oldHolidayData[0]);
    res.render('./attendance/setholiday', { marksheetSetups, oldHolidayData: oldHolidayData[0] || null });
    

  }
  catch (error) {
    console.error('Error setting holiday:', error);
    res.status(500).send('Internal Server Error');
  }
}
exports.savesetHoliday = async (req, res) => {
  try {
    const { academicYear } = req.body;
    await holiday.updateMany(
      {
        academicYear: academicYear,
      },
      {
        $set: {
          academicYear: academicYear,
          month: req.body.month,
          holidayDays: req.body.holidayDays

        },
      },
      { upsert: true }
    );
    res.redirect('/setholiday?academicYear=' + academicYear);

  
  }
  catch (error) {
    console.error('Error saving holiday:', error);
    res.status(500).send('Internal Server Error');
  }
}

    