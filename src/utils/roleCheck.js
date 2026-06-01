export const canAccessRole = (user, role) => {
  if (!user) return false;
  return user.role === role;
};
