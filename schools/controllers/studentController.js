// ==========================================================
// controllers/studentController.js
// STUDENT CONTROLLER
// ==========================================================
//
// RENDERING CONTRACT
// ----------------------------------------------------------
//
// GET     /students
//     -> renders students.ejs
//
// GET     /students/create
//     -> renders student-create.ejs
//
// GET     /students/:id
//     -> renders student-details.ejs
//
// POST    /students
//     -> creates student
//     -> redirects to student details
//
// PUT     /students/:id
//     -> replaces student
//     -> redirects to student details
//
// PATCH   /students/:id
//     -> partially updates student
//     -> redirects to student details
//
// DELETE  /students/:id
//     -> deletes student
//     -> redirects to students list
//
// ==========================================================


const studentService =
    require("../services/studentService");


// ==========================================================
// GET /students
// ==========================================================
//
// Renders:
//     views/students.ejs
//
// Provides:
//     students
//
// ==========================================================

exports.getStudents = async function (
    req,
    res,
    next
) {

    try {

        const students =
            await studentService.getAllStudents();


        return res.render(
            "students",
            {
                students: students
            }
        );

    } catch (error) {

        next(error);

    }

};


// ==========================================================
// GET /students/create
// ==========================================================
//
// Renders:
//     views/student-create.ejs
//
// ==========================================================

exports.getCreateStudentPage = function (
    req,
    res,
    next
) {

    try {

        return res.render(
            "student-create"
        );

    } catch (error) {

        next(error);

    }

};


// ==========================================================
// GET /students/:id
// ==========================================================
//
// Renders:
//     views/student-details.ejs
//
// Provides:
//     student
//
// ==========================================================

exports.getStudentDetails = async function (
    req,
    res,
    next
) {

    try {

        const student =
            await studentService.getStudentById(
                req.params.id
            );


        if (!student) {

            return res.status(404).render(
                "student-details",
                {
                    student: null,
                    error: "Student not found"
                }
            );

        }


        return res.render(
            "student-details",
            {
                student: student
            }
        );

    } catch (error) {

        next(error);

    }

};


// ==========================================================
// POST /students
// ==========================================================
//
// Creates a student.
//
// After successful creation:
//     redirect -> /students/:id
//
// ==========================================================

exports.createStudent = async function (
    req,
    res,
    next
) {

    try {

        const student =
            await studentService.createStudent(
                req.body
            );


        return res.redirect(
            `/students/${student._id}`
        );

    } catch (error) {

        next(error);

    }

};


// ==========================================================
// PUT /students/:id
// ==========================================================
//
// Replaces the student.
//
// After successful update:
//     redirect -> /students/:id
//
// ==========================================================

exports.replaceStudent = async function (
    req,
    res,
    next
) {

    try {

        const student =
            await studentService.replaceStudent(
                req.params.id,
                req.body
            );


        if (!student) {

            return res.status(404).render(
                "student-details",
                {
                    student: null,
                    error: "Student not found"
                }
            );

        }


        return res.redirect(
            `/students/${student._id}`
        );

    } catch (error) {

        next(error);

    }

};


// ==========================================================
// PATCH /students/:id
// ==========================================================
//
// Partially updates the student.
//
// Example:
//
//     PATCH /students/:id
//
//     {
//         status: "suspended"
//     }
//
// After successful update:
//     redirect -> /students/:id
//
// ==========================================================

exports.updateStudent = async function (
    req,
    res,
    next
) {

    try {

        const student =
            await studentService.updateStudent(
                req.params.id,
                req.body
            );


        if (!student) {

            return res.status(404).render(
                "student-details",
                {
                    student: null,
                    error: "Student not found"
                }
            );

        }


        return res.redirect(
            `/students/${student._id}`
        );

    } catch (error) {

        next(error);

    }

};


// ==========================================================
// DELETE /students/:id
// ==========================================================
//
// Deletes the student.
//
// After successful deletion:
//     redirect -> /students
//
// ==========================================================

exports.deleteStudent = async function (
    req,
    res,
    next
) {

    try {

        const student =
            await studentService.deleteStudent(
                req.params.id
            );


        if (!student) {

            return res.status(404).render(
                "students",
                {
                    students: [],
                    error: "Student not found"
                }
            );

        }


        return res.redirect(
            "/students"
        );

    } catch (error) {

        next(error);

    }

};