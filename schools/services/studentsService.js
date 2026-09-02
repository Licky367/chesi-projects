// ==========================================================
// services/studentService.js
// STUDENT SERVICE
// ==========================================================
//
// Handles all database operations for Student.
//
// HTTP operations supported:
//     GET     -> retrieve students
//     POST    -> create student
//     PUT     -> replace/update a student
//     PATCH   -> partially update a student
//     DELETE  -> delete a student
//
// ==========================================================

const Student = require("../models/student");


// ==========================================================
// GET ALL STUDENTS
// ==========================================================

exports.getAllStudents = async function () {

    return await Student.find()
        .sort({ createdAt: -1 });

};


// ==========================================================
// GET ONE STUDENT
// ==========================================================

exports.getStudentById = async function (studentId) {

    return await Student.findById(studentId);

};


// ==========================================================
// CREATE STUDENT
// ==========================================================

exports.createStudent = async function (studentData) {

    const student = new Student(studentData);

    return await student.save();

};


// ==========================================================
// PUT - REPLACE / UPDATE STUDENT
// ==========================================================
//
// PUT is treated as a complete update of the supplied
// student document.
//
// runValidators ensures the model's validation rules
// are applied.
//

exports.replaceStudent = async function (
    studentId,
    studentData
) {

    return await Student.findByIdAndUpdate(
        studentId,
        studentData,
        {
            new: true,
            runValidators: true,
            overwrite: true
        }
    );

};


// ==========================================================
// PATCH - PARTIAL UPDATE STUDENT
// ==========================================================
//
// PATCH changes only the fields supplied by the client.
//

exports.updateStudent = async function (
    studentId,
    studentData
) {

    return await Student.findByIdAndUpdate(
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

exports.deleteStudent = async function (studentId) {

    return await Student.findByIdAndDelete(studentId);

};