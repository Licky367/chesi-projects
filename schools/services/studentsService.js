// ==========================================================
// schools/services/studentsService.js
// STUDENT SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Handles Student CRUD operations.
//
// PROGRAMME TRANSFER RULE
// ----------------------------------------------------------
//
// SAME SCHOOL + DIFFERENT PROGRAMME
//     => INTERSCHOOL TRANSFER
//
// DIFFERENT SCHOOL + DIFFERENT PROGRAMME
//     => INTRASCHOOL TRANSFER
//
// Programme ownership is resolved:
//
//     Programme
//         ↓
//     SchoolDepartment
//         ↓
//     School
//
// When PUT changes a programme:
//
//     1. Validate destination programme.
//     2. Determine source and destination schools.
//     3. Determine transfer type.
//     4. Generate a new registration number using the
//        destination programme.
//     5. Create the appropriate transfer record.
//     6. Update the Student.
//     7. Commit everything in ONE transaction.
//
// ==========================================================

const mongoose = require("mongoose");

const Student =
    require("../models/students");

const Programme =
    require("../models/programmes");

const SchoolDepartment =
    require("../models/schoolDepartments");

const InterschoolTransfer =
    require("../models/interschool");

const IntraschoolTransfer =
    require("../models/intraschool");

const studentAdmissionService =
    require("./studentAdmissionService");


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(value) {

    return mongoose.Types.ObjectId.isValid(value);

}


// ==========================================================
// GET SCHOOL FOR A PROGRAMME
// ==========================================================
//
// Programme
//     -> SchoolDepartment
//     -> School
//
// ==========================================================

async function getSchoolIdForProgramme(
    programmeId,
    session = null
) {

    if (!isValidObjectId(programmeId)) {

        throw new Error(
            "Invalid programme ID."
        );

    }

    const query =
        SchoolDepartment
            .findOne({
                programmes: programmeId
            })
            .select("school")
            .lean();

    if (session) {

        query.session(session);

    }

    const department =
        await query;

    if (
        !department ||
        !department.school
    ) {

        throw new Error(
            `Could not determine the school for programme ${programmeId}.`
        );

    }

    return department.school;

}


// ==========================================================
// DETERMINE PROGRAMME TRANSFER TYPE
// ==========================================================
//
// SAME SCHOOL
//     => interschool-transfer
//
// DIFFERENT SCHOOL
//     => intraschool-transfer
//
// SAME PROGRAMME
//     => no transfer
//
// ==========================================================

async function determineProgrammeTransfer(
    currentProgrammeId,
    newProgrammeId,
    session = null
) {

    if (
        !isValidObjectId(
            currentProgrammeId
        )
    ) {

        throw new Error(
            "Student's current programme is invalid."
        );

    }

    if (
        !isValidObjectId(
            newProgrammeId
        )
    ) {

        throw new Error(
            "The new programme ID is invalid."
        );

    }

    const currentProgramme =
        new mongoose.Types.ObjectId(
            currentProgrammeId
        );

    const newProgramme =
        new mongoose.Types.ObjectId(
            newProgrammeId
        );


    // ------------------------------------------------------
    // SAME PROGRAMME
    // ------------------------------------------------------

    if (
        currentProgramme.equals(
            newProgramme
        )
    ) {

        const school =
            await getSchoolIdForProgramme(
                currentProgramme,
                session
            );

        return {

            type: null,

            fromSchool: school,

            toSchool: school

        };

    }


    // ------------------------------------------------------
    // RESOLVE BOTH SCHOOLS
    // ------------------------------------------------------

    const [
        fromSchool,
        toSchool
    ] = await Promise.all([

        getSchoolIdForProgramme(
            currentProgramme,
            session
        ),

        getSchoolIdForProgramme(
            newProgramme,
            session
        )

    ]);


    // ------------------------------------------------------
    // SAME SCHOOL
    // ------------------------------------------------------

    if (
        fromSchool.equals(toSchool)
    ) {

        return {

            type:
                "interschool-transfer",

            fromSchool,

            toSchool

        };

    }


    // ------------------------------------------------------
    // DIFFERENT SCHOOL
    // ------------------------------------------------------

    return {

        type:
            "intraschool-transfer",

        fromSchool,

        toSchool

    };

}


// ==========================================================
// RESOLVE ADMISSION YEAR
// ==========================================================
//
// If PUT explicitly provides admissionYear, use it.
//
// Otherwise attempt to recover the year from the student's
// current registration number.
//
// Example:
//
//     CSC/001/2026
//             ^^^^
//
// ==========================================================

function resolveAdmissionYear(
    suppliedAdmissionYear,
    registrationNumber
) {

    if (
        suppliedAdmissionYear !==
            undefined &&
        suppliedAdmissionYear !==
            null &&
        String(
            suppliedAdmissionYear
        ).trim() !== ""
    ) {

        return studentAdmissionService
            .normalizeAdmissionYear(
                suppliedAdmissionYear
            );

    }


    if (registrationNumber) {

        const value =
            String(
                registrationNumber
            ).trim();

        const match =
            value.match(
                /\/(\d{4})$/
            );

        if (match) {

            return Number(
                match[1]
            );

        }

    }


    throw new Error(
        "Admission year is required when changing a student's programme."
    );

}


// ==========================================================
// GET ALL STUDENTS
// ==========================================================

exports.getAllStudents =
    async function () {

        return await Student
            .find()
            .sort({
                createdAt: -1
            });

    };


// ==========================================================
// GET STUDENT BY ID
// ==========================================================

exports.getStudentById =
    async function (
        studentId
    ) {

        if (
            !isValidObjectId(
                studentId
            )
        ) {

            return null;

        }

        return await Student
            .findById(
                studentId
            );

    };


// ==========================================================
// CREATE STUDENT
// ==========================================================

exports.createStudent =
    async function (
        studentData
    ) {

        const student =
            new Student(
                studentData
            );

        return await student.save();

    };


// ==========================================================
// PUT / REPLACE STUDENT
// ==========================================================
//
// This is the important part.
//
// A programme change is treated as a transfer.
//
// ==========================================================

exports.replaceStudent =
    async function (
        studentId,
        studentData
    ) {

        if (
            !isValidObjectId(
                studentId
            )
        ) {

            throw new Error(
                "Invalid student ID."
            );

        }


        if (
            !studentData ||
            typeof studentData !== "object"
        ) {

            throw new Error(
                "Student data is required."
            );

        }


        return await studentAdmissionService
            .withTransaction(
                async (session) => {


                    // ==================================================
                    // LOAD CURRENT STUDENT
                    // ==================================================

                    const student =
                        await Student
                            .findById(
                                studentId
                            )
                            .session(
                                session
                            );


                    if (!student) {

                        return null;

                    }


                    // ==================================================
                    // DETERMINE REQUESTED PROGRAMME
                    // ==================================================
                    //
                    // Accept either:
                    //
                    //     programme
                    //
                    // or:
                    //
                    //     newProgrammeId
                    //
                    // ==================================================

                    const requestedProgrammeId =
                        studentData.newProgrammeId ||
                        studentData.programme;


                    const hasProgrammeField =
                        requestedProgrammeId !==
                            undefined &&
                        requestedProgrammeId !==
                            null &&
                        String(
                            requestedProgrammeId
                        ).trim() !== "";


                    let programmeChanged =
                        false;


                    if (
                        hasProgrammeField
                    ) {

                        if (
                            !isValidObjectId(
                                requestedProgrammeId
                            )
                        ) {

                            throw new Error(
                                "Invalid destination programme ID."
                            );

                        }


                        programmeChanged =
                            !student.programme.equals(
                                new mongoose.Types.ObjectId(
                                    requestedProgrammeId
                                )
                            );

                    }


                    // ==================================================
                    // NORMAL PUT
                    // ==================================================
                    //
                    // Programme did not change.
                    //
                    // ==================================================

                    if (
                        !programmeChanged
                    ) {

                        const updateData = {
                            ...studentData
                        };


                        // Not a Student field.
                        delete updateData
                            .newProgrammeId;


                        // Never replace MongoDB _id.
                        delete updateData
                            ._id;


                        if (
                            updateData.programme
                        ) {

                            updateData.programme =
                                new mongoose.Types.ObjectId(
                                    updateData.programme
                                );

                        }


                        Object.keys(
                            updateData
                        ).forEach(
                            (key) => {

                                student[key] =
                                    updateData[key];

                            }
                        );


                        await student.save({
                            session
                        });


                        return student;

                    }


                    // ==================================================
                    // DESTINATION PROGRAMME
                    // ==================================================

                    const newProgramme =
                        await Programme
                            .findById(
                                requestedProgrammeId
                            )
                            .session(
                                session
                            );


                    if (!newProgramme) {

                        throw new Error(
                            "Destination programme not found."
                        );

                    }


                    // ==================================================
                    // DETERMINE TRANSFER
                    // ==================================================

                    const transfer =
                        await determineProgrammeTransfer(
                            student.programme,
                            newProgramme._id,
                            session
                        );


                    if (
                        !transfer.type
                    ) {

                        throw new Error(
                            "The new programme is the same as the student's current programme."
                        );

                    }


                    // ==================================================
                    // ADMISSION YEAR
                    // ==================================================

                    const admissionYear =
                        resolveAdmissionYear(
                            studentData.admissionYear,
                            student.registrationNumber
                        );


                    // ==================================================
                    // GENERATE NEW REGISTRATION NUMBER
                    // ==================================================
                    //
                    // IMPORTANT:
                    //
                    // The DESTINATION programme is used.
                    //
                    // ==================================================

                    const generated =
                        await studentAdmissionService
                            .generateRegistrationNumber({
                                programmeId:
                                    newProgramme._id,

                                admissionYear,

                                session
                            });


                    const previousRegistrationNumber =
                        student.registrationNumber;


                    // ==================================================
                    // TRANSFER STATUS
                    // ==================================================

                    const transferStatus =
                        studentData.transferStatus ||
                        "completed";


                    const isCompleted =
                        transferStatus ===
                        "completed";


                    const isPending =
                        transferStatus ===
                        "pending";


                    const isRejected =
                        transferStatus ===
                        "rejected";


                    const isCancelled =
                        transferStatus ===
                        "cancelled";


                    // ==================================================
                    // COMMON TRANSFER DATA
                    // ==================================================

                    const commonTransferData = {

                        student:
                            student._id,

                        previousRegistrationNumber,

                        registrationNumber:
                            generated.registrationNumber,

                        registrationSequence:
                            generated.registrationSequence,

                        fromProgramme:
                            student.programme,

                        toProgramme:
                            newProgramme._id,

                        admissionYear,

                        academicYear:
                            studentData.academicYear,

                        academicSession:
                            studentData.academicSession,

                        reason:
                            studentData.reason,

                        approvedBy:
                            studentData.approvedBy,

                        remarks:
                            studentData.remarks,

                        status:
                            transferStatus,

                        approvedAt:
                            (
                                isPending ||
                                isRejected ||
                                isCancelled
                            )
                                ? undefined
                                : new Date(),

                        completedAt:
                            isCompleted
                                ? new Date()
                                : undefined

                    };


                    // ==================================================
                    // CREATE TRANSFER RECORD
                    // ==================================================

                    let transferRecord;


                    // ==================================================
                    // INTERSCHOOL
                    // ==================================================
                    //
                    // SAME SCHOOL
                    // DIFFERENT PROGRAMME
                    //
                    // ==================================================

                    if (
                        transfer.type ===
                        "interschool-transfer"
                    ) {

                        const records =
                            await InterschoolTransfer
                                .create(
                                    [
                                        {

                                            ...commonTransferData,

                                            school:
                                                transfer.fromSchool

                                        }
                                    ],
                                    {
                                        session
                                    }
                                );


                        transferRecord =
                            records[0];

                    }


                    // ==================================================
                    // INTRASCHOOL
                    // ==================================================
                    //
                    // DIFFERENT SCHOOL
                    // DIFFERENT PROGRAMME
                    //
                    // ==================================================

                    else if (
                        transfer.type ===
                        "intraschool-transfer"
                    ) {

                        const records =
                            await IntraschoolTransfer
                                .create(
                                    [
                                        {

                                            ...commonTransferData,

                                            fromSchool:
                                                transfer.fromSchool,

                                            toSchool:
                                                transfer.toSchool

                                        }
                                    ],
                                    {
                                        session
                                    }
                                );


                        transferRecord =
                            records[0];

                    }


                    // ==================================================
                    // UPDATE STUDENT
                    // ==================================================

                    const updateData = {
                        ...studentData
                    };


                    // --------------------------------------------------
                    // Remove fields that are not Student fields.
                    // --------------------------------------------------

                    delete updateData
                        .newProgrammeId;

                    delete updateData
                        .admissionYear;

                    delete updateData
                        .academicYear;

                    delete updateData
                        .academicSession;

                    delete updateData
                        .reason;

                    delete updateData
                        .approvedBy;

                    delete updateData
                        .remarks;

                    delete updateData
                        .transferStatus;

                    delete updateData
                        ._id;


                    // --------------------------------------------------
                    // Apply ordinary Student fields.
                    // --------------------------------------------------

                    Object.keys(
                        updateData
                    ).forEach(
                        (key) => {

                            student[key] =
                                updateData[key];

                        }
                    );


                    // ==================================================
                    // TRANSFER-CONTROLLED FIELDS
                    // ==================================================

                    student.programme =
                        newProgramme._id;


                    student.registrationNumber =
                        generated.registrationNumber;


                    // Keep a record of where the programme change
                    // originated.
                    student.admissionSource =
                        transfer.type;


                    if (
                        transfer.type ===
                        "interschool-transfer"
                    ) {

                        student.hasInterschoolTransfer =
                            true;

                    }


                    if (
                        transfer.type ===
                        "intraschool-transfer"
                    ) {

                        student.hasIntraschoolTransfer =
                            true;

                    }


                    // ==================================================
                    // SAVE STUDENT
                    // ==================================================

                    await student.save({
                        session
                    });


                    // ==================================================
                    // RETURN COMPLETE RESULT
                    // ==================================================

                    return {

                        student,

                        transfer:
                            transferRecord,

                        transferType:
                            transfer.type,

                        previousRegistrationNumber,

                        registrationNumber:
                            generated.registrationNumber,

                        registrationSequence:
                            generated.registrationSequence,

                        admissionYear

                    };

                }
            );

    };


// ==========================================================
// PATCH / PARTIAL UPDATE
// ==========================================================
//
// PATCH remains a normal partial Student update.
//
// Programme transfers should flow through PUT because changing
// programme has registration-number and transfer-history
// consequences.
//
// ==========================================================

exports.updateStudent =
    async function (
        studentId,
        studentData
    ) {

        if (
            !isValidObjectId(
                studentId
            )
        ) {

            throw new Error(
                "Invalid student ID."
            );

        }


        return await Student
            .findByIdAndUpdate(
                studentId,
                {
                    $set: studentData
                },
                {
                    new: true,
                    runValidators: true
                }
            );

    };


// ==========================================================
// DELETE STUDENT
// ==========================================================

exports.deleteStudent =
    async function (
        studentId
    ) {

        if (
            !isValidObjectId(
                studentId
            )
        ) {

            throw new Error(
                "Invalid student ID."
            );

        }


        return await Student
            .findByIdAndDelete(
                studentId
            );

    };


// ==========================================================
// EXPORT HELPERS
// ==========================================================

exports.getSchoolIdForProgramme =
    getSchoolIdForProgramme;


exports.determineProgrammeTransfer =
    determineProgrammeTransfer;