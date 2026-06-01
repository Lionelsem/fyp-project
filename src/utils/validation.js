export const validateEmail = (email) => {
  return typeof email === "string" && email.includes("@");
};

export const validatePassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};
