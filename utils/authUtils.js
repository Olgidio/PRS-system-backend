exports.requireRole = (allowedRoles, actualRoleId) => {
  return allowedRoles.includes(actualRoleId);
};
