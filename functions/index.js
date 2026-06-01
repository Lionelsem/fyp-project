const functions = require("firebase-functions");
const authFunctions = require("./authFunctions");
const reportFunctions = require("./reportFunctions");
const inspectionFunctions = require("./inspectionFunctions");
const notificationFunctions = require("./notificationFunctions");

module.exports = {
  ...authFunctions,
  ...reportFunctions,
  ...inspectionFunctions,
  ...notificationFunctions
};
