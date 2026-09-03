const mongoose = require("mongoose");

const Student = require("../models/students");
const Programme = require("../models/programmes");
const SchoolDepartment = require("../models/schoolDepartments");
const InterschoolTransfer = require("../models/interschool");
const IntraschoolTransfer = require("../models/intraschool");

/*
 * Resolve the School that owns a Programme.
 *
 * The current project structure does not put school directly on
 * Programme. Programme belongs to SchoolDepartment, and
 * SchoolDepartment belongs to School.
 *
 * Therefore school detection must happen through:
 *
 * Programme -> SchoolDepartment -> School
 */
async function getSchoolIdForProgramme(programmeId, session) {
  if (!mongoose.Types.ObjectId.isValid(programmeId)) {
    throw new Error("Invalid programme ID.");
  }

  const department = await SchoolDepartment.findOne({
    programmes: programmeId
  })
    .select("school")
    .session(session || null)
    .lean();

  if (!department || !department.school) {
    throw new Error(
      `Could not determine the school for programme ${programmeId}.`
    );
  }

  return department.school;
}

/*
 * Determine the transfer category.
 *
 * SAME SCHOOL + DIFFERENT PROGRAMME
 *     => interschool-transfer
 *
 * DIFFERENT SCHOOL + DIFFERENT PROGRAMME
 *     => intraschool-transfer
 *
 * SAME PROGRAMME
 *     => not a programme transfer
 */
async function determineTransferType(
  currentProgrammeId,
  newProgrammeId,
  session
) {
  const currentProgramme = new mongoose.Types.ObjectId(
    currentProgrammeId
  );

  const newProgramme = new mongoose.Types.ObjectId(
    newProgrammeId
  );

  if (currentProgramme.equals(newProgramme)) {
    return {
      type: null,
      fromSchool: await getSchoolIdForProgramme(
        currentProgramme,
        session
      ),
      toSchool: await getSchoolIdForProgramme(
        newProgramme,
        session
      )
    };
  }

  const [fromSchool, toSchool] = await Promise.all([
    getSchoolIdForProgramme(currentProgramme, session),
    getSchoolIdForProgramme(newProgramme, session)
  ]);

  return {
    type: fromSchool.equals(toSchool)
      ? "interschool-transfer"
      : "intraschool-transfer",
    fromSchool,
    toSchool
  };
}

/*
 * Change a student's programme and automatically create the correct
 * transfer record.
 *
 * This is the main method controllers should call.
 *
 * Example:
 *
 * await studentTransferService.changeProgramme({
 *   studentId,
 *   newProgrammeId,
 *   academicYear: "2026/27",
 *   academicSession: "2026/27, September-December",
 *   reason: "Approved programme change"
 * });
 */
async function changeProgramme({
  studentId,
  newProgrammeId,
  academicYear,
  academicSession,
  reason,
  approvedBy,
  remarks,
  status = "completed"
}) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error("Invalid student ID.");
  }

  if (!mongoose.Types.ObjectId.isValid(newProgrammeId)) {
    throw new Error("Invalid new programme ID.");
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const student = await Student.findById(studentId)
        .session(session);

      if (!student) {
        throw new Error("Student not found.");
      }

      const newProgramme = await Programme.findById(newProgrammeId)
        .session(session);

      if (!newProgramme) {
        throw new Error("New programme not found.");
      }

      const oldProgrammeId = student.programme;

      const transfer = await determineTransferType(
        oldProgrammeId,
        newProgramme._id,
        session
      );

      if (!transfer.type) {
        throw new Error(
          "The new programme is the same as the student's current programme."
        );
      }

      /*
       * Create the transfer history first. This makes the source of
       * the new admission state auditable.
       */
      if (transfer.type === "interschool-transfer") {
        const [record] = await InterschoolTransfer.create(
          [
            {
              student: student._id,
              fromProgramme: oldProgrammeId,
              toProgramme: newProgramme._id,
              school: transfer.fromSchool,
              academicYear,
              academicSession,
              reason,
              approvedBy,
              remarks,
              status,
              approvedAt:
                status === "approved" || status === "completed"
                  ? new Date()
                  : undefined,
              completedAt:
                status === "completed"
                  ? new Date()
                  : undefined
            }
          ],
          { session }
        );

        student.programme = newProgramme._id;
        student.admissionSource = "interschool-transfer";
        student.hasInterschoolTransfer = true;

        await student.save({ session });

        result = {
          student,
          transfer: record,
          transferType: "interschool-transfer"
        };
      } else {
        const [record] = await IntraschoolTransfer.create(
          [
            {
              student: student._id,
              fromProgramme: oldProgrammeId,
              toProgramme: newProgramme._id,
              fromSchool: transfer.fromSchool,
              toSchool: transfer.toSchool,
              academicYear,
              academicSession,
              reason,
              approvedBy,
              remarks,
              status,
              approvedAt:
                status === "approved" || status === "completed"
                  ? new Date()
                  : undefined,
              completedAt:
                status === "completed"
                  ? new Date()
                  : undefined
            }
          ],
          { session }
        );

        student.programme = newProgramme._id;
        student.admissionSource = "intraschool-transfer";
        student.hasIntraschoolTransfer = true;

        await student.save({ session });

        result = {
          student,
          transfer: record,
          transferType: "intraschool-transfer"
        };
      }
    });

    return result;
  } finally {
    await session.endSession();
  }
}

/*
 * Convenience methods for controllers/services that already know
 * which kind of transfer they are expecting.
 */
async function processInterschoolTransfer(options) {
  const result = await changeProgramme(options);

  if (result.transferType !== "interschool-transfer") {
    throw new Error(
      "The selected programmes belong to different schools. This is an intraschool transfer."
    );
  }

  return result;
}

async function processIntraschoolTransfer(options) {
  const result = await changeProgramme(options);

  if (result.transferType !== "intraschool-transfer") {
    throw new Error(
      "The selected programmes belong to the same school. This is an interschool transfer."
    );
  }

  return result;
}

/*
 * Read the student's current admission source and transfer history.
 */
async function getStudentTransferProfile(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error("Invalid student ID.");
  }

  const student = await Student.findById(studentId)
    .populate("programme")
    .lean();

  if (!student) {
    throw new Error("Student not found.");
  }

  const [interschoolTransfers, intraschoolTransfers] =
    await Promise.all([
      InterschoolTransfer.find({ student: studentId })
        .populate("fromProgramme toProgramme school")
        .sort({ createdAt: -1 })
        .lean(),

      IntraschoolTransfer.find({ student: studentId })
        .populate(
          "fromProgramme toProgramme fromSchool toSchool"
        )
        .sort({ createdAt: -1 })
        .lean()
    ]);

  return {
    student,
    admissionSource: student.admissionSource,
    hasInterschoolTransfer: !!student.hasInterschoolTransfer,
    hasIntraschoolTransfer: !!student.hasIntraschoolTransfer,
    interschoolTransfers,
    intraschoolTransfers
  };
}

module.exports = {
  getSchoolIdForProgramme,
  determineTransferType,
  changeProgramme,
  processInterschoolTransfer,
  processIntraschoolTransfer,
  getStudentTransferProfile
};
