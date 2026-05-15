const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexus.local' },
    update: {
      password: adminPassword,
    },
    create: {
      email: 'admin@nexus.local',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created: admin@nexus.local / admin123');

  // 2. Create Sample Inventory
  const items = [
    { name: 'MacBook Pro M3', sku: 'LAP-001', quantity: 15, price: 2499.99 },
    { name: 'iPhone 15 Pro', sku: 'PHN-001', quantity: 25, price: 1099.00 },
    { name: 'Samsung S24 Ultra', sku: 'PHN-002', quantity: 20, price: 1199.50 },
    { name: 'Dell XPS 15', sku: 'LAP-002', quantity: 10, price: 1850.00 },
    { name: 'AirPods Pro', sku: 'ACC-001', quantity: 50, price: 249.00 },
  ];

  for (const item of items) {
    await prisma.inventory.upsert({
      where: { sku: item.sku },
      update: { quantity: item.quantity, price: item.price },
      create: item,
    });
  }
  console.log('✅ Sample inventory items created');

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
