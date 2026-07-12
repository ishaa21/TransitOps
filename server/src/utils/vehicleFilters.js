const buildVehicleWhere = ({ vehicleType, status, region }) => {
  const where = {}

  if (vehicleType) {
    where.type = vehicleType
  }

  if (status) {
    where.status = status
  }

  if (region) {
    where.regNo = { startsWith: `${region}-` }
  }

  return where
}

const hasVehicleFilters = (query) =>
  Boolean(query.vehicleType || query.status || query.region)

const matchesVehicleFilters = (vehicle, { vehicleType, status, region }) => {
  if (vehicleType && vehicle.type !== vehicleType) return false
  if (status && vehicle.status !== status) return false
  if (region && !vehicle.regNo.startsWith(`${region}-`)) return false
  return true
}

module.exports = { buildVehicleWhere, hasVehicleFilters, matchesVehicleFilters }
