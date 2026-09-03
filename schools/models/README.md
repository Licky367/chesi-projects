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



## ADDITIONAL FILES TO SUPPORT THE DATABASE:


# Schools programme-transfer update

## Files

- `models/students.js`
- `models/interschool.js`
- `models/intraschool.js`
- `services/studentTransferService.js`

## Business rule implemented

The application uses these admission sources:

1. `kuccps`
2. `institutional-transfer`
3. `interschool-transfer`
4. `intraschool-transfer`

The meanings are deliberately implemented according to the requested application rule:

### Interschool transfer

The student changes programme while remaining in the same School.

Example:

`School A / Programme 1 -> School A / Programme 2`

The Student document becomes:

```js
admissionSource: "interschool-transfer"
hasInterschoolTransfer: true
```

A complete `InterschoolTransfer` document is also created.

### Intraschool transfer

The student changes programme and the programme belongs to another School.

Example:

`School A / Programme 1 -> School B / Programme 2`

The Student document becomes:

```js
admissionSource: "intraschool-transfer"
hasIntraschoolTransfer: true
```

A complete `IntraschoolTransfer` document is also created.

## Important architecture detail

The repository's current `Programme` model does not contain a direct `school` field.

Instead:

`Programme -> SchoolDepartment -> School`

The service therefore resolves the School through `SchoolDepartment.programmes`.

This is based on the current repository structure.

## How to use the service

```js
const studentTransferService =
  require("../services/studentTransferService");

const result =
  await studentTransferService.changeProgramme({
    studentId: req.params.studentId,
    newProgrammeId: req.body.newProgrammeId,
    academicYear: "2026/27",
    academicSession: "2026/27, September-December",
    reason: "Approved programme change",
    approvedBy: req.user?.staffId,
    remarks: req.body.remarks
  });
```

The service uses a MongoDB transaction so that the Student update and transfer-history document are committed together.

## Initial admission

For a newly admitted student, set:

```js
admissionSource: "kuccps"
```

or:

```js
admissionSource: "institutional-transfer"
```

The transfer service should NOT be used to create the initial admission.

## Existing institutional-transfer model

The project already has an `institutionTransfer.js` model. Keep using it for the initial `institutional-transfer` admission source. This package does not replace that model.
