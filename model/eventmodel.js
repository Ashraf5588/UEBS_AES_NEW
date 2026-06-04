const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: false },
    description: { type: String, required: false },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: false },
    material: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
   teacherName: { type: String, required: true },
    forClass: { type: [String], required: true },
    nepaliDate: { type: String, default: '' },
    reminder7Sent: { type: Boolean, default: false },
    reminder7SentDate: { type: String, default: '' },
    reminder1Sent: { type: Boolean, default: false },
    reminder1SentDate: { type: String, default: '' }
});

const EventModel = mongoose.model('Event', eventSchema, 'Events');
module.exports = EventModel;