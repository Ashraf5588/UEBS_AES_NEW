const mongoose = require('mongoose');
const Event = require('../model/eventmodel');

const nodemailer = require("nodemailer");
const cron = require("node-cron");
const { adminSchema,superadminSchema, teacherSchema} = require("../model/admin");

const Users = mongoose.model("userlist", teacherSchema, "users");
const admin = require(".././firebase");

const { classSchema, subjectSchema, terminalSchema,newsubjectSchema} = require("../model/adminschema");
const { marksheetsetupschemaForAdmin } = require("../model/marksheetschema");
const marksheetSetup = mongoose.model("marksheetSetup", marksheetsetupschemaForAdmin, "marksheetSetup");
const { name } = require("ejs");
const subjectlist = mongoose.model("subjectlist", subjectSchema, "subjectlist");
const studentClass = mongoose.model("studentClass", classSchema, "classlist");
const newsubject = mongoose.model("newsubject", newsubjectSchema, "newsubject");

const getSidenavData = async (req) => {
  try {
    const subjects = await subjectlist.find({}).lean();
   
    const studentClassdata = await studentClass.find({}).lean();
    const newsubjects = await newsubject.find({}).lean();
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
        accessibleSubject = newsubjects;
        accessibleClass = studentClassdata;
      } else {
        // Filter subjects based on user's allowed subjects
        accessibleSubject = newsubjects.filter(subj =>
          user.allowedSubjects && user.allowedSubjects.some(allowed =>
            allowed.subject === subj.newsubject
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
      accessibleSubject = newsubjects;
      accessibleClass = studentClassdata;
    }
    
    return {
      subjects: accessibleSubject,
      studentClassdata: accessibleClass,
      
    };
  } catch (error) {
    console.error('Error fetching sidenav data:', error);
    return {
      subjects: [],
      studentClassdata: [],
     
    };
  }
};
// Show the form to create a new event
exports.createEventForm = async (req, res) => {
  const sidenavData = await getSidenavData(req);
  let events = [];
  let editEvent = null;
  try {
       if (req.user.role === 'ADMIN') {
         events = await Event.find().sort({ date: -1 }).lean();
       } else {
         events = await Event.find({ teacherName: req.user.teacherName }).sort({ date: -1 }).lean();
       }

      const editEventId = req.query.id || req.params.id;
      if (editEventId) {
        const eventRecord = await Event.findById(editEventId).lean();
        if (eventRecord) {
          if (req.user.role === 'ADMIN' || eventRecord.teacherName === req.user.teacherName) {
            editEvent = eventRecord;
          }
        }
      }
  } catch (err) {
      console.error("Error fetching events:", err);
  }

  res.render('eventsremainder/createevent', { sidenavData, teacherName: req.user.teacherName, events, editEvent }); // Render the form view
};

// Start or Update event
exports.saveEvent = async (req, res) => {
  const { id, title, subject, description, date, time, forClass, section, teacherName, location, material } = req.body;
  const classList = Array.isArray(forClass)
    ? forClass.map((item) => String(item || '').trim()).filter(Boolean)
    : [String(forClass || '').trim()].filter(Boolean);
  const formatTo12Hour = (value) => {
    const match = String(value || '').match(/^([01][0-9]|2[0-3]):([0-5][0-9])$/);
    if (!match) return String(value || '').trim();
    const hoursNum = Number(match[1]);
    const minutes = match[2];
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12;
    return `${hours12}:${minutes}${period}`;
  };
  const formattedTime = formatTo12Hour(time);
  
  try {
    if (id) {
      // Update existing event
      await Event.findByIdAndUpdate(id, {
        title,
        subject,
        description,
        date,
        time: formattedTime,
        forClass: classList,
        section,
        teacherName,
        location,
        material
      });
      res.redirect('/createevent?saved=1');
    } else {
      // Create new event
      const event = new Event({
        title,
        subject,
        description,
        date,
        time: formattedTime,
        teacherName,
        forClass: classList,
        location,
        material,
      });
      await event.save();
      res.redirect('/createevent?saved=1');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

exports.deleteEvent = async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.redirect('/createevent');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


// List all events
exports.listEvents = (req, res) => {
    Event.find()
        .then(events => {
            res.render('createevent', { events }); // Render the events list view
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Server Error');
        });
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.user,
    pass: process.env.pass 
  }
});
const formatEventDate = (value) => {
  if (!value) {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const sendReminderEmail = async (to, title, description, date, time, location, forClass, teacherName, daysBefore) => {
  const label = daysBefore === 1 ? '1-day reminder' : '7-day reminder';
  const formattedDate = formatEventDate(date) || String(date || '').trim();
  const classLabel = Array.isArray(forClass) ? forClass.join(', ') : String(forClass || '').trim();

  const mailOptions = {
    from: process.env.user,
    to: to,
    subject: `Event reminder (${label}): ${title}`,
    html: `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2933;">
      <h2 style="margin:0 0 8px;">Upcoming event reminder</h2>
      <p style="margin:0 0 16px;">This is your ${label} for the event below.</p>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;"><b>Event</b></td><td>${title}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><b>Date</b></td><td>${formattedDate}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><b>Time</b></td><td>${time || '-'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><b>Location</b></td><td>${location || '-'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><b>Class</b></td><td>${classLabel || '-'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><b>Teacher</b></td><td>${teacherName || '-'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;"><b>Description</b></td><td>${description || '-'}</td></tr>
      </table>
      <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;" />
      <p style="margin:0;color:#6b7280;">This is an automated reminder from the school system.</p>
    </div>
  `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent");
  } catch (err) {
    console.log(err);
  }
};

const checkEventReminders = async () => {
  try {
    const emailtoSend = ["ashrafalimiya77@gmail.com","rehanmiya977@gmail.com","axeldhungana123@gmail.com","unitedecd@gmail.com"];
 
    const now = new Date();
    const getKathmanduDateKey = (value) => {
      if (!value) {
        return '';
      }

      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '';
      }

      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kathmandu',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const year = parts.find((part) => part.type === 'year')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      const day = parts.find((part) => part.type === 'day')?.value;
      if (!year || !month || !day) {
        return '';
      }

      return `${year}-${month}-${day}`;
    };

    const dateKeyToUtc = (key) => {
      const [year, month, day] = String(key || '').split('-').map((part) => Number(part));
      if (!year || !month || !day) {
        return null;
      }
      return Date.UTC(year, month - 1, day);
    };

    const todayKey = getKathmanduDateKey(now);
    const todayUtc = dateKeyToUtc(todayKey);

    

    const upcomingEvents = await Event.find();
     // Events in the next 7 days
    for (const event of upcomingEvents) {
       const eventDate = new Date(event.date);
       const eventKey = getKathmanduDateKey(eventDate);
       const eventUtc = dateKeyToUtc(eventKey);
       if (!eventKey || eventUtc === null || todayUtc === null) {
         continue;
       }
      const diffDays = Math.round((eventUtc - todayUtc) / (1000 * 60 * 60 * 24));
      if (diffDays === 7 && !event.reminder7Sent) {
        await sendReminderEmail(emailtoSend, event.title, event.description, event.date, event.time, event.location, event.forClass, event.teacherName, 7);
        event.reminder7Sent = true;
        await event.save();
        
      }
       const isOneDayBefore = diffDays === 1;
       const kathmanduHour = Number(new Intl.DateTimeFormat('en-GB', {
         timeZone: 'Asia/Kathmandu',
         hour: '2-digit',
         hour12: false
       }).format(now));
       const isSameDayAfterSeven = diffDays === 0 && kathmanduHour >= 7;
       if ((isOneDayBefore || isSameDayAfterSeven) && !event.reminder1Sent) {
        await sendReminderPush(event.title);
        await sendReminderEmail(
          emailtoSend,
          event.title,
          event.description,
          event.date,
          event.time,
          event.location,
          event.forClass,
          event.teacherName,
          1
        );

        event.reminder1Sent = true;
        await event.save();
      }
    }

    
    
  } catch (err) {
    console.error("Error checking event reminders:", err);
  }
};
cron.schedule("0 7 * * *", async () => {
  console.log("Running reminder job...");
  await checkEventReminders();
});





exports.saveFcmToken = async (req, res) => {

  try {
    const { token } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!token) {
      return res.status(400).json({ message: "FCM token is required" });
    }

    const userId = req.user._id;

    await Users.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: token }
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};


const sendPushNotification = async (tokens, title, body) => {
  try {
    const message = {
      notification: {
        title: title,
        body: body
      },
      tokens: tokens // array of FCM tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("✅ Success:", response.successCount);
console.log("❌ Failure:", response.failureCount);
console.log("✅ Success:", response.successCount);
console.log("❌ Failure:", response.failureCount);

response.responses.forEach((res, index) => {
  if (!res.success) {
    console.log("❌ Token error:", tokens[index]);
    console.log("👉 Reason:", res.error);
  }
});
  
  } catch (error) {
    console.error("Push error:", error);
  }
};
const sendReminderPush = async (title) => {
  const users = await Users.find({ fcmTokens: { $exists: true,$ne: [] } });
  const tokens = users.map(u => u.fcmTokens).flat() || [];
console.log("Tokens to send push:", tokens);
console.log("Sending push for event:", title);
  await sendPushNotification(
    tokens,
    "Upcoming Event Reminder",
    `Don't forget about the upcoming event: ${title}`
  );
  
};

