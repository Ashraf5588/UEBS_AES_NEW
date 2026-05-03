const mongoose = require('mongoose');
const HealthRecord = require('../model/nurseschema');
const Medicine = require('../model/medicineschema');
const MedicineDistribution = require('../model/medicinedistribution');
const PadDistribution = require('../model/padrecordschema');
const { studentrecordschema, classSchema } = require('../model/adminschema');

const StudentRecord = mongoose.models.studentRecord ||
    mongoose.model('studentRecord', studentrecordschema, 'studentrecord');
const ClassList = mongoose.models.studentClass ||
    mongoose.model('studentClass', classSchema, 'classlist');

const calculateAgeFromDob = (dobValue) => {
    const dob = dobValue ? new Date(dobValue) : null;
    if (!dob || Number.isNaN(dob.getTime())) {
        return '';
    }

    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
        months -= 1;
        const previousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += previousMonth.getDate();
    }

    if (months < 0) {
        years -= 1;
        months += 12;
    }

    return `${years} Year ${months} Month ${days} Days`;
};

const normalizeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const getHeightInCm = (feet, inch) => {
    const heightFeet = normalizeNumber(feet) || 0;
    const heightInch = normalizeNumber(inch) || 0;
    const totalInches = (heightFeet * 12) + heightInch;
    if (totalInches <= 0) {
        return null;
    }
    return totalInches * 2.54;
};

const getBmiValue = (feet, inch, weight) => {
    const heightCm = getHeightInCm(feet, inch);
    const weightKg = normalizeNumber(weight);
    if (!heightCm || !weightKg || weightKg <= 0) {
        return '';
    }
    const meters = heightCm / 100;
    if (meters <= 0) {
        return '';
    }
    return (weightKg / (meters * meters)).toFixed(2);
};

const naturalSort = (left, right) => String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base'
});

const parseBmiValue = (value) => {
    const bmi = Number.parseFloat(String(value || '').trim());
    return Number.isFinite(bmi) ? bmi : null;
};

const getBmiCategory = (value) => {
    const bmi = parseBmiValue(value);
    if (bmi === null) {
        return null;
    }

    if (bmi < 18.5) {
        return 'Underweight';
    }

    if (bmi < 25) {
        return 'Normal';
    }

    if (bmi < 30) {
        return 'Overweight';
    }

    return 'Obese';
};

const groupStudentOptions = (students) => {
    const classMap = new Map();

    for (const student of students) {
        const className = String(student.studentClass || '').trim();
        const sectionName = String(student.section || '').trim();
        if (!className || !sectionName) {
            continue;
        }

        if (!classMap.has(className)) {
          classMap.set(className, new Set());
        }
        classMap.get(className).add(sectionName);
    }

    return [...classMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(([className, sectionSet]) => ({
            className,
            sections: [...sectionSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        }));
};

exports.showHealthRecordForm = async (req, res) => {
    try {
        res.render('nurse/healthrecordform');
    } catch (error) {
        console.error('Error rendering health record form:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.showMedicineForm = async (req, res) => {
    try {
        res.render('nurse/medicine');
    } catch (error) {
        console.error('Error rendering medicine form:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getMedicineNames = async (req, res) => {
    try {
        const medicines = await Medicine.find()
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(medicines);
    } catch (error) {
        console.error('Error fetching medicine names:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.saveMedicineName = async (req, res) => {
    try {
        const medicineName = String(req.body.medicineName || '').trim();

        if (!medicineName) {
            return res.status(400).json({ message: 'Medicine name is required' });
        }

        const medicine = new Medicine({
            medicineName
        });

        await medicine.save();

        res.status(201).json({
            message: 'Medicine saved successfully',
            medicine
        });
    } catch (error) {
        console.error('Error saving medicine name:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updateMedicineName = async (req, res) => {
    try {
        const medicineId = String(req.params.id || '').trim();
        const medicineName = String(req.body.medicineName || '').trim();

        if (!medicineId) {
            return res.status(400).json({ message: 'Medicine id is required' });
        }

        if (!medicineName) {
            return res.status(400).json({ message: 'Medicine name is required' });
        }

        const medicine = await Medicine.findByIdAndUpdate(
            medicineId,
            { medicineName },
            { new: true, runValidators: true }
        );

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        res.status(200).json({
            message: 'Medicine updated successfully',
            medicine
        });
    } catch (error) {
        console.error('Error updating medicine name:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteMedicineName = async (req, res) => {
    try {
        const medicineId = String(req.params.id || '').trim();

        if (!medicineId) {
            return res.status(400).json({ message: 'Medicine id is required' });
        }

        const medicine = await Medicine.findByIdAndDelete(medicineId);

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        res.status(200).json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        console.error('Error deleting medicine name:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.showMedicineDistributedRecordForm = async (req, res) => {
    try {
        res.render('nurse/medicinedistributedrecord');
    } catch (error) {
        console.error('Error rendering medicine distribution form:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.showPadRecordForm = async (req, res) => {
    try {
        res.render('nurse/padrecord');
    } catch (error) {
        console.error('Error rendering pad record form:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.showHealthAnalytics = async (req, res) => {
    try {
        const students = await StudentRecord.find({ bmi: { $nin: [null, ''] } })
            .select('name studentClass section roll bmi')
            .lean();

        const groups = {
            Underweight: [],
            Normal: [],
            Overweight: [],
            Obese: []
        };

        for (const student of students) {
            const category = getBmiCategory(student.bmi);
            if (!category) {
                continue;
            }

            groups[category].push({
                name: student.name || '-',
                studentClass: student.studentClass || '-',
                section: student.section || '-',
                roll: student.roll || '-',
                bmi: parseBmiValue(student.bmi) !== null ? parseBmiValue(student.bmi).toFixed(2) : String(student.bmi || '-')
            });
        }

        const orderedGroups = [
            { key: 'Underweight', label: 'Underweight', color: 'blue' },
            { key: 'Normal', label: 'Normal', color: 'green' },
            { key: 'Overweight', label: 'Overweight', color: 'orange' },
            { key: 'Obese', label: 'Obese', color: 'red' }
        ].map((group) => ({
            ...group,
            count: groups[group.key].length,
            students: groups[group.key]
                .sort((left, right) => naturalSort(left.name, right.name))
        }));

        res.render('nurse/healthanalytics', {
            bmiGroups: orderedGroups,
            totalWithBmi: students.length
        });
    } catch (error) {
        console.error('Error rendering health analytics:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getMedicineDistributionOptions = async (req, res) => {
    try {
        const classRows = await ClassList.find({})
            .select('studentClass section')
            .lean();

        const medicines = await Medicine.find({})
            .select('_id medicineName')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            groups: groupStudentOptions(classRows),
            medicines
        });
    } catch (error) {
        console.error('Error loading medicine distribution options:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getMedicineDistributionStudents = async (req, res) => {
    try {
        const medicineId = String(req.query.medicineId || '').trim();
        const studentClass = String(req.query.studentClass || '').trim();
        const section = String(req.query.section || '').trim();
        const gender = String(req.query.gender || 'all').trim().toLowerCase();

        if (!medicineId) {
            return res.status(400).json({ message: 'Medicine is required' });
        }

        if (!studentClass || !section) {
            return res.status(400).json({ message: 'Class and section are required' });
        }

        const studentFilter = { studentClass, section };
        if (gender && gender !== 'all') {
            studentFilter.gender = { $regex: `^${gender}$`, $options: 'i' };
        }

        const students = await StudentRecord.find(studentFilter)
            .sort({ roll: 1, name: 1 })
            .lean();

        const studentIds = students.map((student) => student._id);
        const distributionRecords = studentIds.length > 0
            ? await MedicineDistribution.find({ medicineId, studentId: { $in: studentIds } }).lean()
            : [];

        const distributionMap = new Map(
            distributionRecords.map((record) => [String(record.studentId), record])
        );

        const rows = students.map((student) => {
            const existing = distributionMap.get(String(student._id));
            return {
                id: String(student._id),
                reg: student.reg || '',
                roll: student.roll || '',
                name: student.name || '',
                gender: student.gender || '',
                studentClass: student.studentClass || '',
                section: student.section || '',
                taken: Boolean(existing && existing.taken),
                recordId: existing ? String(existing._id) : ''
            };
        });

        const takenStudents = rows
            .filter((row) => row.taken)
            .map((row) => ({
                id: row.id,
                roll: row.roll,
                name: row.name,
                gender: row.gender
            }));

        res.status(200).json({
            rows,
            summary: {
                totalStudents: rows.length,
                takenCount: takenStudents.length,
                takenStudents
            }
        });
    } catch (error) {
        console.error('Error loading medicine distribution students:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.saveMedicineDistributionRecords = async (req, res) => {
    try {
        const medicineId = String(req.body.medicineId || '').trim();
        const medicineNameInput = String(req.body.medicineName || '').trim();
        const entries = Array.isArray(req.body.entries) ? req.body.entries : [];

        if (!medicineId) {
            return res.status(400).json({ message: 'Medicine is required' });
        }

        if (!entries.length) {
            return res.status(400).json({ message: 'No student records to save' });
        }

        const medicine = await Medicine.findById(medicineId).lean();
        const resolvedMedicineName = String((medicine && medicine.medicineName) || medicineNameInput || '').trim();
        if (!resolvedMedicineName) {
            return res.status(400).json({ message: 'Medicine name is required' });
        }

        const savedRecords = [];

        for (const entry of entries) {
            const studentId = String(entry.id || '').trim();
            if (!studentId) {
                continue;
            }

            const student = await StudentRecord.findById(studentId).lean();
            if (!student) {
                continue;
            }

            const taken = Boolean(entry.taken);
            const updatedRecord = await MedicineDistribution.findOneAndUpdate(
                { medicineId, studentId },
                {
                    medicineId,
                    medicineName: resolvedMedicineName,
                    studentId,
                    reg: student.reg || '',
                    roll: student.roll || '',
                    name: student.name || '',
                    gender: student.gender || '',
                    studentClass: student.studentClass || '',
                    section: student.section || '',
                    taken,
                    takenAt: taken ? new Date() : null
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            ).lean();

            if (updatedRecord) {
                savedRecords.push(updatedRecord);
            }
        }

        const takenRecords = savedRecords.filter((record) => record.taken);

        res.status(200).json({
            message: 'Medicine distribution saved successfully',
            summary: {
                totalStudents: savedRecords.length,
                takenCount: takenRecords.length,
                takenStudents: takenRecords.map((record) => ({
                    id: String(record.studentId || ''),
                    roll: record.roll || '',
                    name: record.name || '',
                    gender: record.gender || ''
                }))
            }
        });
    } catch (error) {
        console.error('Error saving medicine distribution records:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.createHealthRecord = async (req, res) => {
    try {
        console.log('Health record save request received:', {
            bodyKeys: Object.keys(req.body || {}),
            reg: req.body && req.body.reg ? req.body.reg : '',
            name: req.body && req.body.name ? req.body.name : '',
            studentClass: req.body && req.body.studentClass ? req.body.studentClass : '',
            section: req.body && req.body.section ? req.body.section : '',
            roll: req.body && req.body.roll ? req.body.roll : ''
        });

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

        if (!reg || !name || !diagnosis || !treatment) {
            console.log('Health record validation failed:', {
                hasReg: Boolean(reg),
                hasName: Boolean(name),
                hasDiagnosis: Boolean(diagnosis),
                hasTreatment: Boolean(treatment)
            });
        }

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
        console.log('Saving health record document...');
        const savedHealthRecord = await healthRecord.save();
        console.log('Health record saved to:', {
            database: mongoose.connection.db ? mongoose.connection.db.databaseName : '',
            collection: HealthRecord.collection ? HealthRecord.collection.name : '',
            id: savedHealthRecord && savedHealthRecord._id ? String(savedHealthRecord._id) : ''
        });
        
       return res.status(201).json({
    success: true,
    message: 'Health record saved'
});
    } catch (error) {
        console.error('Error creating health record:', error && error.stack ? error.stack : error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.savePadRecord = async (req, res) => {
    try {
        const studentId = String(req.body.studentId || '').trim();
        const quantityValue = Number(req.body.quantity);

        if (!studentId) {
            return res.status(400).json({ message: 'Select a student from the suggestions first' });
        }

        if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
            return res.status(400).json({ message: 'Quantity is required' });
        }

        const student = await StudentRecord.findById(studentId).lean();
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const padRecord = new PadDistribution({
            studentId: student._id,
            reg: student.reg || '',
            name: student.name || '',
            studentClass: student.studentClass || '',
            section: student.section || '',
            roll: student.roll || '',
            quantity: quantityValue,
            createdAt: new Date()
        });

        const savedPadRecord = await padRecord.save();
        console.log('Pad record saved to:', {
            database: mongoose.connection.db ? mongoose.connection.db.databaseName : '',
            collection: PadDistribution.collection ? PadDistribution.collection.name : '',
            id: savedPadRecord && savedPadRecord._id ? String(savedPadRecord._id) : ''
        });

        res.status(201).json({ message: 'Pad record created successfully', padRecord: savedPadRecord });
    } catch (error) {
        console.error('Error creating pad record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getPadRecordsFiltered = async (req, res) => {
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
        } else if (range === 'today') {
            const dayRange = getDayRange(now);
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
            startDate = null;
            endDate = null;
        }

        const filter = (startDate && endDate)
            ? {
                createdAt: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
            : {};

        const records = await PadDistribution.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(records);
    } catch (error) {
        console.error('Error fetching filtered pad records:', error);
        res.status(500).json({ message: error && error.message ? error.message : 'Internal server error' });
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
        const range = String(req.query.range || 'all').trim();
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
        } else if (range === 'all') {
            startDate = null;
            endDate = null;
        } else {
            const dayRange = getDayRange(now);
            startDate = dayRange.start;
            endDate = dayRange.end;
        }

        const filter = (startDate && endDate)
            ? {
                createdAt: {
                    $gte: startDate,
                    $lt: endDate
                }
            }
            : {};

        const records = await HealthRecord.find(filter)
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
            .select('_id reg name studentClass section roll fatherName address')
            .limit(10)
            .lean();

        res.status(200).json(results);
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.showBmiForm = async (req, res) => {
    try {
        res.render('nurse/bmi');
    } catch (error) {
        console.error('Error rendering BMI form:', error);
        res.status(500).send('Internal Server Error');
    }
};

exports.getBmiFilterOptions = async (req, res) => {
    try {
        const classRows = await ClassList.find({})
            .select('studentClass section')
            .lean();

        const yearRows = await StudentRecord.aggregate([
            {
                $match: {
                    registrationDate: { $type: 'date' }
                }
            },
            {
                $project: {
                    academicYear: { $year: '$registrationDate' }
                }
            },
            {
                $group: {
                    _id: '$academicYear'
                }
            },
            {
                $sort: {
                    _id: -1
                }
            }
        ]);

        const groupedMap = new Map();

        for (const row of classRows) {
            const className = String(row.studentClass || '').trim();
            const sectionName = String(row.section || '').trim();
            if (!className || !sectionName) {
                continue;
            }

            if (!groupedMap.has(className)) {
                groupedMap.set(className, new Set());
            }
            groupedMap.get(className).add(sectionName);
        }

        const grouped = [...groupedMap.entries()]
            .sort(([left], [right]) => naturalSort(left, right))
            .map(([className, sectionSet]) => ({
                className,
                sections: [...sectionSet].sort(naturalSort)
            }));

        res.status(200).json({
            groups: grouped,
            academicYears: yearRows.map((item) => item._id).filter(Boolean)
        });
    } catch (error) {
        console.error('Error loading BMI filter options:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getBmiStudents = async (req, res) => {
    try {
        const studentClass = String(req.query.studentClass || '').trim();
        const section = String(req.query.section || '').trim();
        const academicYear = String(req.query.academicYear || '').trim();

        if (!studentClass || !section) {
            return res.status(400).json({ message: 'Class and section are required' });
        }

        const filter = {
            studentClass,
            section
        };

        if (academicYear) {
            const year = Number.parseInt(academicYear, 10);
            if (!Number.isNaN(year)) {
                filter.registrationDate = {
                    $gte: new Date(year, 0, 1),
                    $lt: new Date(year + 1, 0, 1)
                };
            }
        }

        const students = await StudentRecord.find(filter)
            .sort({ roll: 1, name: 1 })
            .lean();

        const rows = students.map((student) => ({
            id: String(student._id),
            reg: student.reg || '',
            roll: student.roll || '',
            name: student.name || '',
            gender: student.gender || '',
            dob: student.dob || '',
            age: student.age || calculateAgeFromDob(student.dob),
            heightFeet: student.heightFeet || '',
            heightInch: student.heightInch || '',
            weight: student.weight || '',
            muaq: student.muaq || '',
            bmi: student.bmi || getBmiValue(student.heightFeet, student.heightInch, student.weight)
        }));

        res.status(200).json({ rows });
    } catch (error) {
        console.error('Error loading BMI students:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.saveBmiRows = async (req, res) => {
    try {
        const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
        if (!entries.length) {
            return res.status(400).json({ message: 'No BMI rows to save' });
        }

        const updates = [];

        for (const entry of entries) {
            const studentId = String(entry.id || '').trim();
            if (!studentId) {
                continue;
            }

            const heightFeet = normalizeNumber(entry.heightFeet);
            const heightInch = normalizeNumber(entry.heightInch);
            const weight = String(entry.weight || '').trim();
            const muaq = String(entry.muaq || '').trim();
            const bmi = String(entry.bmi || getBmiValue(heightFeet, heightInch, weight) || '').trim();

            const student = await StudentRecord.findById(studentId);
            if (!student) {
                continue;
            }

            student.heightFeet = heightFeet;
            student.heightInch = heightInch;
            student.height = heightFeet !== null && heightInch !== null
                ? `${heightFeet} ft ${heightInch} in`
                : student.height;
            student.weight = weight;
            student.muaq = muaq;
            student.bmi = bmi;
            student.age = calculateAgeFromDob(student.dob) || student.age;
            await student.save();

            updates.push({
                id: String(student._id),
                bmi: student.bmi,
                age: student.age
            });
        }

        res.status(200).json({ message: 'BMI data saved successfully', updates });
    } catch (error) {
        console.error('Error saving BMI rows:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};