const mongoose = require('mongoose');
const HealthRecord = require('../model/nurseschema');
const { studentrecordschema } = require('../model/adminschema');

const StudentRecord = mongoose.models.studentRecord ||
    mongoose.model('studentRecord', studentrecordschema, 'studentrecord');

exports.showHealthRecordForm = async (req, res) => {
    try {
        res.render('nurse/healthrecordform');
    } catch (error) {
        console.error('Error rendering health record form:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.createHealthRecord = async (req, res) => {
    try {
        const {
            reg,
            name,
            studentClass,
            section,
            roll,
            fatherName,
            address,
            diagnosis,
            treatment,
            remarks
        } = req.body;

        const healthRecord = new HealthRecord({
            reg,
            name,
            studentClass,
            section,
            roll,
            fatherName,
            address,
            diagnosis,
            treatment,
            remarks
        });
        await healthRecord.save();
        res.status(201).json({ message: 'Health record created successfully', healthRecord });
    } catch (error) {
        console.error('Error creating health record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getHealthRecords = async (req, res) => {
    try {
        const healthRecords = await HealthRecord.find();
        res.status(200).json(healthRecords);
    } catch (error) {
        console.error('Error fetching health records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getDayRange = (dateValue) => {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return { start, end };
};

const sanitizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
exports.getHealthRecordsFiltered = async (req, res) => {
    try {
        const range = String(req.query.range || 'today').trim();
        const dateQuery = String(req.query.date || '').trim();

        const now = new Date();
        let startDate;
        let endDate;
        if (dateQuery) {
            const dayRange = getDayRange(dateQuery);
            if (!dayRange) {
                return res.status(400).json({ message: 'Invalid date' });
            }
            startDate = dayRange.start;
            endDate = dayRange.end;
        } else if (range === 'last7') {
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        } else if (range === 'lastMonth') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (range === 'thisYear') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
        } else {
            const dayRange = getDayRange(now);
            startDate = dayRange.start;
            endDate = dayRange.end;
        }

        const records = await HealthRecord.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        })
            .sort({ createdAt: -1 })
            .lean();

        const regs = [...new Set(records.map((item) => String(item.reg || '')).filter(Boolean))];
        let students = [];

        try {
            students = regs.length > 0
                ? await StudentRecord.find({ reg: { $in: regs } })
                    .select('reg numberofmobile fatherContact motherContact otherguardianContact')
                    .lean()
                : [];
        } catch (lookupError) {
            console.error('Health records contact lookup failed:', lookupError);
            students = [];
        }

        const contactMap = new Map(
            students.map((student) => {
                const contact = student.numberofmobile || student.fatherContact || student.motherContact || student.otherguardianContact || '';
                return [String(student.reg || ''), String(contact || '')];
            })
        );

        const responseData = records.map((record) => {
            const contact = contactMap.get(String(record.reg || '')) || '';
            return {
                ...record,
                contact,
                dialNumber: sanitizePhone(contact)
            };
        });

        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error fetching filtered health records:', error);
        res.status(500).json({ message: error && error.message ? error.message : 'Internal server error' });
    }
};

exports.searchStudents = async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        if (query.length < 2) {
            return res.status(200).json([]);
        }

        const results = await StudentRecord.find({
            name: { $regex: query, $options: 'i' }
        })
            .select('reg name studentClass section roll fatherName address')
            .limit(10)
            .lean();

        res.status(200).json(results);
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};