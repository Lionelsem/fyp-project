const authFunctions = require("./authFunctions");
const reportFunctions = require("./reportFunctions");
const inspectionFunctions = require("./inspectionFunctions");
const notificationFunctions = require("./notificationFunctions");
const priorityFunctions = require("./priorityFunctions");

module.exports = {
  ...authFunctions,
  ...reportFunctions,
  ...inspectionFunctions,
  ...notificationFunctions,
  ...priorityFunctions
};
