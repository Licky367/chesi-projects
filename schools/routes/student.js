// ==========================================================
// routes/student.js
// STUDENT ROUTES
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const studentController =
    require("../controllers/studentController");


// ==========================================================
// GET
// ==========================================================
//
// GET /students
//     Get all students.
//
// GET /students/:id
//     Get one student.
//

router.get(
    "/students",
    studentController.getStudents
);

router.get(
    "/students/:id",
    studentController.getStudents
);


// ==========================================================
// POST
// ==========================================================
//
// POST /students
//     Create a new student.
//

router.post(
    "/students",
    studentController.createStudent
);


// ==========================================================
// PUT
// ==========================================================
//
// PUT /students/:id
//     Replace/update an existing student.
//

router.put(
    "/students/:id",
    studentController.replaceStudent
);


// ==========================================================
// PATCH
// ==========================================================
//
// PATCH /students/:id
//     Partially update an existing student.
//

router.patch(
    "/students/:id",
    studentController.updateStudent
);


// ==========================================================
// DELETE
// ==========================================================
//
// DELETE /students/:id
//     Delete an existing student.
//

router.delete(
    "/students/:id",
    studentController.deleteStudent
);


module.exports = router;