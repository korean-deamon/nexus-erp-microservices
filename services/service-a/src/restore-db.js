const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function restore() {
    console.log('🗑️ Clearing all existing data...');
    // Ma'lumotlarni o'chirish (Foreign key bog'liqliklariga qarab tartib bilan)
    await prisma.basketItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.user.deleteMany({});
    
    console.log('🔄 Restoring Nexus Data...');
    
    const password = await bcrypt.hash('password123', 10);
    
    // 1. Admin yaratish
    const admin = await prisma.user.upsert({
        where: { email: 'admin@nexus.io' },
        update: {},
        create: {
            email: 'admin@nexus.io',
            password: password,
            name: 'Artie Admin',
            role: 'ADMIN'
        }
    });
    console.log('✅ Admin Created: admin@nexus.io / password123');

    // 2. Sample Inventory yaratish
    const products = [
        { name: 'Quantum Processor', sku: 'CPU-Q1', quantity: 15, price: 1200 },
        { name: 'Fusion Cell', sku: 'PWR-F1', quantity: 40, price: 450 },
        { name: 'Neural Link v2', sku: 'LNK-V2', quantity: 10, price: 2500 },
        { name: 'Nano Battery', sku: 'BAT-N1', quantity: 100, price: 85 },
        { name: 'Laptop X1', sku: 'LAP-X1', quantity: 5, price: 1500 }
    ];

    for (const p of products) {
        await prisma.inventory.upsert({
            where: { sku: p.sku },
            update: { quantity: p.quantity, price: p.price },
            create: p
        });
    }
    console.log('✅ Inventory Restored!');
    
    console.log('🚀 DB Restoration Complete!');
}

restore()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
