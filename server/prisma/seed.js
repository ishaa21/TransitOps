require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

const vehicles = [
  {
    regNo: 'MH-12-AB-1234',
    name: 'Tata Prima 5530',
    type: 'Heavy Truck',
    capacityKg: 25000,
    odometer: 142500,
    acquisitionCost: 3200000,
    status: 'Available',
  },
  {
    regNo: 'MH-14-CD-5678',
    name: 'Ashok Leyland 4220',
    type: 'Container Truck',
    capacityKg: 18000,
    odometer: 98500,
    acquisitionCost: 2850000,
    status: 'OnTrip',
  },
  {
    regNo: 'KA-05-MN-9012',
    name: 'Eicher Pro 6048',
    type: 'Tipper',
    capacityKg: 22000,
    odometer: 67800,
    acquisitionCost: 2650000,
    status: 'Available',
  },
  {
    regNo: 'DL-01-XY-3456',
    name: 'Mahindra Blazo X 49',
    type: 'Heavy Truck',
    capacityKg: 31000,
    odometer: 201300,
    acquisitionCost: 3450000,
    status: 'InShop',
  },
  {
    regNo: 'TN-09-PQ-7890',
    name: 'Volvo FM 460',
    type: 'Long Haul',
    capacityKg: 28000,
    odometer: 175600,
    acquisitionCost: 5200000,
    status: 'Available',
  },
]

const drivers = [
  {
    name: 'Rajesh Kumar',
    licenseNo: 'DL-2020-45821',
    licenseCategory: 'HMV',
    licenseExpiry: new Date('2027-06-15'),
    contact: '+91-9876543210',
    safetyScore: 92,
    status: 'Available',
  },
  {
    name: 'Suresh Patel',
    licenseNo: 'GJ-2019-33102',
    licenseCategory: 'HMV',
    licenseExpiry: new Date('2026-11-20'),
    contact: '+91-9876543211',
    safetyScore: 88,
    status: 'OnTrip',
  },
  {
    name: 'Amit Sharma',
    licenseNo: 'RJ-2021-77234',
    licenseCategory: 'HMV',
    licenseExpiry: new Date('2028-03-10'),
    contact: '+91-9876543212',
    safetyScore: 95,
    status: 'Available',
  },
  {
    name: 'Vikram Singh',
    licenseNo: 'UP-2018-11987',
    licenseCategory: 'HMV',
    licenseExpiry: new Date('2026-08-05'),
    contact: '+91-9876543213',
    safetyScore: 76,
    status: 'OffDuty',
  },
  {
    name: 'Deepak Reddy',
    licenseNo: 'AP-2022-55643',
    licenseCategory: 'HMV',
    licenseExpiry: new Date('2029-01-25'),
    contact: '+91-9876543214',
    safetyScore: 90,
    status: 'Available',
  },
]

async function main() {
  console.log('Seeding vehicles...')
  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { regNo: vehicle.regNo },
      update: vehicle,
      create: vehicle,
    })
  }

  console.log('Seeding drivers...')
  for (const driver of drivers) {
    const existing = await prisma.driver.findFirst({
      where: { licenseNo: driver.licenseNo },
    })

    if (existing) {
      await prisma.driver.update({ where: { id: existing.id }, data: driver })
    } else {
      await prisma.driver.create({ data: driver })
    }
  }

  console.log(`Seeded ${vehicles.length} vehicles and ${drivers.length} drivers.`)

  const vehicleRecords = await prisma.vehicle.findMany({ orderBy: { id: 'asc' } })
  const driverRecords = await prisma.driver.findMany({ orderBy: { id: 'asc' } })

  const trips = [
    {
      source: 'Mumbai',
      destination: 'Pune',
      vehicleId: vehicleRecords[1]?.id,
      driverId: driverRecords[1]?.id,
      cargoWeightKg: 12000,
      plannedDistanceKm: 150,
      status: 'Dispatched',
      revenue: 45000,
    },
    {
      source: 'Bengaluru',
      destination: 'Chennai',
      vehicleId: vehicleRecords[4]?.id,
      driverId: driverRecords[2]?.id,
      cargoWeightKg: 18000,
      plannedDistanceKm: 345,
      status: 'Draft',
      revenue: null,
    },
    {
      source: 'Delhi',
      destination: 'Jaipur',
      vehicleId: vehicleRecords[0]?.id,
      driverId: driverRecords[0]?.id,
      cargoWeightKg: 9500,
      plannedDistanceKm: 280,
      status: 'Dispatched',
      revenue: 62000,
    },
    {
      source: 'Hyderabad',
      destination: 'Vijayawada',
      vehicleId: vehicleRecords[2]?.id,
      driverId: driverRecords[4]?.id,
      cargoWeightKg: 14000,
      plannedDistanceKm: 275,
      status: 'Completed',
      revenue: 38000,
    },
    {
      source: 'Ahmedabad',
      destination: 'Surat',
      vehicleId: vehicleRecords[1]?.id,
      driverId: driverRecords[1]?.id,
      cargoWeightKg: 8000,
      plannedDistanceKm: 265,
      status: 'Draft',
      revenue: null,
    },
    {
      source: 'Kolkata',
      destination: 'Bhubaneswar',
      vehicleId: vehicleRecords[4]?.id,
      driverId: driverRecords[2]?.id,
      cargoWeightKg: 11000,
      plannedDistanceKm: 440,
      status: 'Dispatched',
      revenue: 71000,
    },
  ]

  console.log('Seeding trips...')
  for (const trip of trips) {
    if (!trip.vehicleId || !trip.driverId) continue

    const existing = await prisma.trip.findFirst({
      where: {
        source: trip.source,
        destination: trip.destination,
        vehicleId: trip.vehicleId,
      },
    })

    if (existing) {
      await prisma.trip.update({ where: { id: existing.id }, data: trip })
    } else {
      await prisma.trip.create({ data: trip })
    }
  }

  console.log(`Seeded ${trips.length} trips.`)

  console.log('Seeding default user accounts...')
  const passwordHashDefault = await bcrypt.hash('password', 10)
  const passwordHashAlt = await bcrypt.hash('password123', 10)
  
  const usersToSeed = [
    { email: 'fleet_manager@transitops.in', password: passwordHashDefault, role: 'FleetManager' },
    { email: 'dispatcher@transitops.in', password: passwordHashDefault, role: 'Dispatcher' },
    { email: 'safety_officer@transitops.in', password: passwordHashDefault, role: 'SafetyOfficer' },
    { email: 'financial_analyst@transitops.in', password: passwordHashDefault, role: 'FinancialAnalyst' },
    { email: 'fleet.m@transitops.in', password: passwordHashAlt, role: 'FleetManager' },
    { email: 'raven.k@transitops.in', password: passwordHashAlt, role: 'Dispatcher' },
    { email: 'safety.o@transitops.in', password: passwordHashAlt, role: 'SafetyOfficer' },
    { email: 'analyst.f@transitops.in', password: passwordHashAlt, role: 'FinancialAnalyst' },
  ]

  for (const u of usersToSeed) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, password: u.password },
      create: { email: u.email, role: u.role, password: u.password },
    })
  }
  console.log(`Seeded ${usersToSeed.length} user accounts.`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
