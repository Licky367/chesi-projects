// ==========================================================
// CREATE SUBSTATION
// ==========================================================

exports.create = async (body) => {

  const name =
    text(body.name);

  if (!name) {
    throw new Error(
      "Substation name is required."
    );
  }

  if (
    await Substation.findOne({ name })
  ) {
    throw new Error(
      "A substation with that name already exists."
    );
  }

  let phoneNumber = null;

  if (
    body.phoneNumber !== undefined &&
    body.phoneNumber !== ""
  ) {

    phoneNumber =
      Number(body.phoneNumber);

    if (!Number.isFinite(phoneNumber)) {
      throw new Error(
        "Phone number must be a valid number."
      );
    }
  }

  return Substation.create({

    name,

    location:
      text(body.location),

    phoneNumber,

    directions:
      text(body.directions),

    description:
      text(body.description),

    substationIcon: "",

    images: []
  });
};