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