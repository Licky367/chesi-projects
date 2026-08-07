const ProjectUser = require("../models/projectUser");
const ProjectUserInvitation = require("../models/projectUserInvitations");

exports.createInvitation = async ({ email, role }) => {
  // Check if user already exists
  const existingUser = await ProjectUser.findOne({ email });

  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  // Check if invitation already exists
  const existingInvite = await ProjectUserInvitation.findOne({ email });

  if (existingInvite) {
    throw new Error("Invitation already exists for this email");
  }

  // Create invitation
  const invitation = await ProjectUserInvitation.create({
    email,
    role,
  });

  return invitation;
};