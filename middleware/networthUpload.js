// ==========================================================
// middleware/networthUpload.js
// ==========================================================

const multer = require("multer");
const path = require("path");
const fs = require("fs");


// ==========================================================
// UPLOAD DIRECTORY
// ==========================================================

const uploadDir =
    path.join(
        process.cwd(),
        "public",
        "uploads"
    );


// ==========================================================
// ENSURE DIRECTORY EXISTS
// ==========================================================

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(
        uploadDir,
        {
            recursive: true
        }
    );

}


// ==========================================================
// STORAGE
// ==========================================================

const storage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            cb
        ) {

            cb(
                null,
                uploadDir
            );

        },


        filename: function (
            req,
            file,
            cb
        ) {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();


            const baseName =
                path
                    .basename(
                        file.originalname,
                        extension
                    )
                    .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "-"
                    )
                    .substring(
                        0,
                        50
                    );


            const uniqueName =

                `${baseName}-${Date.now()}-${Math.round(
                    Math.random() * 1E9
                )}${extension}`;


            cb(
                null,
                uniqueName
            );

        }

    });


// ==========================================================
// FILE FILTER
// ==========================================================

function fileFilter(
    req,
    file,
    cb
) {

    if (
        !file.mimetype ||
        !file.mimetype.startsWith("image/")
    ) {

        return cb(
            new Error(
                "Only image files are allowed."
            ),
            false
        );

    }


    cb(
        null,
        true
    );

}


// ==========================================================
// MULTER INSTANCE
// ==========================================================

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                5 * 1024 * 1024,

            files:
                1

        }

    });


// ==========================================================
// UPDATE ASSET IMAGE MIDDLEWARE
// ==========================================================
//
// The EJS uses:
//
// name="profileImage"
//
// Therefore:
//
// upload.single("profileImage")
//
// ==========================================================

const updateAssetUpload =
    upload.single(
        "profileImage"
    );


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    updateAssetUpload;