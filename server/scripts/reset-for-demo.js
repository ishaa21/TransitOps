require('dotenv').config()
const prisma = require('../src/prisma')

const DEMO_USERS = [
  { email: 'fleet@transitops.in', password: 'demo123', role: 'FleetManager' },
  { email: 'dispatch@transitops.in', password: 'demo123', role: 'Dispatcher' },
  { email: 'safety@transitops.in', password: 'demo123', role: 'SafetyOfficer' },
  { email: 'finance@transitops.in', password: 'demo123', role: 'FinancialAnalyst' },
]

async function main() {
  console.log('Clearing operational data (not seed — fresh demo)...')
  await prisma.expense.deleteMany()
  await prisma.fuelLog.deleteMany()
  await prisma.maintenanceLog.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.user.deleteMany()

  const bcrypt = require('bcrypt')
  for (const user of DEMO_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10)
    await prisma.user.create({
      data: { email: user.email, password: hashedPassword, role: user.role },
    })
    console.log(`  Registered ${user.email} (${user.role})`)
  }

  console.log('Database reset complete — ready for live demo data.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
