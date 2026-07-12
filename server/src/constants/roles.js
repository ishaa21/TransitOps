const ROLES = Object.freeze([
  'FleetManager',
  'Dispatcher',
  'SafetyOfficer',
  'FinancialAnalyst',
])

const isValidRole = (role) => ROLES.includes(role)

module.exports = { ROLES, isValidRole }
