# Corrected schools/models

This package contains the corrected school models plus the new academic-registration,
student-finance, and student-academics models.

## Files

- `schools.js`
- `schoolDepartments.js`
- `programmes.js`
- `staff.js`
- `students.js`
- `units.js`
- `programmeFee.js`
- `registrations.js`
- `studentFinance.js`
- `studentAcademics.js`

## Academic session

`Registration` stores:

- `currentAcademicYear`, e.g. `2025/26`
- `currentSemester`, one of:
  - `September-December`
  - `January-April`
  - `May-August`

Its `currentAcademicSession` virtual produces:

`2025/26, May-August`

## Student status

Students use:

- `on-session`
- `off-session`
- `differed`
- `suspended`
- `expelled`

Only `on-session` students are synchronized into the current-session fee calculation.

## Student finance

`StudentFinance` stores one financial record per student per academic session:

- fee items
- amount required
- amount paid
- fee balance
- payment history
- academic year/semester/session
- year of study

`StudentFinance.syncCurrentSessionFee(studentId)` resolves the current
registration, student's programme and year of study, then obtains the required
fee from `ProgrammeFee`.

## Student academics

`StudentAcademics.unitsRegistered` stores historical unit registrations grouped
by academic session.

`currentUnitsRegistered` stores only the units currently registered in the
current academic session.

Each registered unit can hold:

- `unit`
- `score`
- `grade`

## Important application rule

The model layer stores and validates the data. The application's registration
and payment services/controllers should call the appropriate methods when a
student changes session status, registers units, or makes a payment.
