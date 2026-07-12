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

module.exports = { buildVehicleWhere, hasVehicleFilters }
