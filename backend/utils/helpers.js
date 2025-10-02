// utils/helpers.js
function isValidDate(dateString) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;
  const d = new Date(dateString);
  return !isNaN(d.getTime());
}

function tryParseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return jsonString;
  }
}

function generateCalculationId(deviceId, date) {
  const dateStr = date.replace(/-/g, '');
  return `CALC-${deviceId}-${dateStr}`;
}

module.exports = {
  isValidDate,
  tryParseJSON,
  generateCalculationId
};