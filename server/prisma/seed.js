const { PrismaClient } = require('@prisma/client')

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
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
