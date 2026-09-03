// ==========================================================
// schools/services/studentAdmissionService.js
// CENTRAL REGISTRATION NUMBER GENERATION
// ==========================================================
//
// IMPORTANT:
// This is the ONLY place in the admission/transfer workflow
// where a registration number is generated.
//
// Format:
//     PROGRAMME_CODE/SEQUENCE/ADMISSION_YEAR
//
// Example:
//     BCS/001/2026
//
// The sequence is maintained per programme + admission year.
// All admission/transfer flows must call generateRegistrationNumber()
// instead of calculating a registration number themselves.
// ==========================================================

const mongoose = require("mongoose");

const Student = require("../models/students");
const Programme = require("../models/programmes");
const RegistrationCounter = require("../models/registrationCounter");


// ==========================================================
// CONSTANTS
// ==========================================================

const COUNTER_PADDING = 3;


// ==========================================================
// NORMALIZE ADMISSION YEAR
// ==========================================================
//
// Accepts:
//   2026
//   "2026"
//   "2025/26"
//
// Returns the four-digit starting year.
// ==========================================================

function normalizeAdmissionYear(admissionYear) {

    if (
        admissionYear === undefined ||
        admissionYear === null ||
        admissionYear === ""
    ) {
        throw new Error("Admission year is required.");
    }

    if (typeof admissionYear === "number") {

        if (
            !Number.isInteger(admissionYear) ||
            admissionYear < 1900 ||
            admissionYear > 9999
        ) {
            throw new Error("Invalid admission year.");
        }

        return admissionYear;
    }

    const value = String(admissionYear).trim();

    // YYYY
    if (/^\d{4}$/.test(value)) {

        const year = Number(value);

        if (year < 1900 || year > 9999) {
            throw new Error("Invalid admission year.");
        }

        return year;
    }

    // YYYY/YY
    const match = value.match(/^(\d{4})\/\d{2}$/);

    if (match) {

        const year = Number(match[1]);

        if (year < 1900 || year > 9999) {
            throw new Error("Invalid admission year.");
        }

        return year;
    }

    throw new Error(
        "Admission year must be in YYYY or YYYY/YY format."
    );
}


// ==========================================================
// GET PROGRAMME CODE
// ==========================================================

async function getProgrammeCode(programmeId, session = null) {

    if (!programmeId) {
        throw new Error("Programme is required to generate a registration number.");
    }

    const query = Programme
        .findById(programmeId)
        .select("code name");

    if (session) {
        query.session(session);
    }

    const programme = await query;

    if (!programme) {
        throw new Error("Programme not found.");
    }

    if (!programme.code) {
        throw new Error(
            `Programme "${programme.name || programmeId}" has no programme code.`
        );
    }

    const programmeCode =
        String(programme.code)
            .trim()
            .toUpperCase();

    if (!programmeCode) {
        throw new Error("Programme code cannot be empty.");
    }

    return programmeCode;
}


// ==========================================================
// ATOMIC SEQUENCE ALLOCATION
// ==========================================================
//
// The counter model must have a unique compound index:
//
//   { programme: 1, admissionYear: 1 }
//
// The $inc operation makes sequence allocation atomic.
// ==========================================================

async function allocateSequence(
    programmeId,
    admissionYear,
    session = null
) {

    const query = RegistrationCounter.findOneAndUpdate(

        {
            programme: programmeId,
            admissionYear: admissionYear
        },

        {
            $inc: {
                sequence: 1
            },

            $setOnInsert: {
                programme: programmeId,
                admissionYear: admissionYear
            }
        },

        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    if (session) {
        query.session(session);
    }

    const counter = await query;

    if (!counter || !counter.sequence) {
        throw new Error(
            "Unable to allocate a registration sequence."
        );
    }

    return counter.sequence;
}


// ==========================================================
// CENTRAL REGISTRATION NUMBER GENERATOR
// ==========================================================
//
// DO NOT duplicate this logic in:
//   - students.js
//   - kuccpsPlacements.js
//   - institutionalTransfers.js
//   - interschool.js
//   - intraschool.js
//   - controllers
//   - routers
//
// Every flow must call this function.
// ==========================================================

async function generateRegistrationNumber({
    programmeId,
    admissionYear,
    session = null
}) {

    if (!programmeId) {
        throw new Error("Programme is required.");
    }

    const normalizedAdmissionYear =
        normalizeAdmissionYear(admissionYear);

    const programmeCode =
        await getProgrammeCode(
            programmeId,
            session
        );

    const sequence =
        await allocateSequence(
            programmeId,
            normalizedAdmissionYear,
            session
        );

    const paddedSequence =
        String(sequence)
            .padStart(COUNTER_PADDING, "0");

    const registrationNumber =
        `${programmeCode}/${paddedSequence}/${normalizedAdmissionYear}`;

    return {
        registrationNumber,
        registrationSequence: sequence,
        programmeId,
        programmeCode,
        admissionYear: normalizedAdmissionYear
    };
}


// ==========================================================
// OPTIONAL TRANSACTION HELPER
// ==========================================================
//
// Use this helper when the caller needs registration-number
// allocation and related Student/source-document updates to
// happen atomically.
//
// The helper retries transient transaction errors.
// ==========================================================

async function withTransaction(work, options = {}) {

    const maxRetries =
        Number.isInteger(options.maxRetries)
            ? options.maxRetries
            : 3;

    let attempt = 0;

    while (attempt < maxRetries) {

        attempt += 1;

        const session =
            await mongoose.startSession();

        try {

            let result;

            await session.withTransaction(
                async () => {

                    result =
                        await work(session);

                }
            );

            return result;

        } catch (error) {

            const retryable =
                error &&
                (
                    error.hasErrorLabel &&
                    (
                        error.hasErrorLabel("TransientTransactionError") ||
                        error.hasErrorLabel("UnknownTransactionCommitResult")
                    )
                );

            if (!retryable || attempt >= maxRetries) {
                throw error;
            }

        } finally {

            await session.endSession();
        }
    }
}


// ==========================================================
// ASSIGN NUMBER TO A STUDENT
// ==========================================================
//
// This function demonstrates how the central generator is
// consumed. It does NOT calculate the number itself.
//
// Existing registration numbers are preserved unless the
// caller explicitly requests a new registration number.
// ==========================================================

async function assignNewRegistrationNumber({
    studentId,
    programmeId,
    admissionYear,
    session = null
}) {

    if (!studentId) {
        throw new Error("Student ID is required.");
    }

    const generated =
        await generateRegistrationNumber({
            programmeId,
            admissionYear,
            session
        });

    const query =
        Student.findByIdAndUpdate(

            studentId,

            {
                $set: {
                    registrationNumber:
                        generated.registrationNumber,

                    registrationSequence:
                        generated.registrationSequence
                }
            },

            {
                new: true,
                runValidators: true
            }
        );

    if (session) {
        query.session(session);
    }

    const student = await query;

    if (!student) {
        throw new Error("Student not found.");
    }

    return {
        student,
        ...generated
    };
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    generateRegistrationNumber,

    assignNewRegistrationNumber,

    allocateSequence,

    getProgrammeCode,

    normalizeAdmissionYear,

    withTransaction

};