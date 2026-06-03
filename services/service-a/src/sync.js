const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SERVICE_B_URL = process.env.SERVICE_B_URL || 'http://service-analytics:8000';

async function syncToAnalytics(action, entity, payload) {
    try {
        await fetch(`${SERVICE_B_URL}/internal/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, entity, payload })
        });
    } catch (err) {
        console.error('Failed to sync with Analytics:', err.message);
    }
}

async function runFullSync() {
    try {
        console.log('🔄 Running FULL SYNC to Analytics Engine...');
        const users     = await prisma.user.findMany();
        const inventory = await prisma.inventory.findMany();
        const orders    = await prisma.order.findMany();
        await syncToAnalytics('FULL_SYNC', 'ALL', { users, inventory, orders });
        console.log('✅ FULL SYNC Complete');
    } catch (err) {
        console.error('❌ FULL SYNC Failed:', err.message);
    }
}

function registerPrismaMiddleware() {
    prisma.$use(async (params, next) => {
        const result = await next(params);
        try {
            const action = params.action.toUpperCase();
            if (params.model === 'User' && action === 'CREATE') {
                syncToAnalytics('CREATE', 'USER', result);
            } else if (params.model === 'Inventory') {
                if (['CREATE', 'UPDATE'].includes(action)) syncToAnalytics(action, 'INVENTORY', result);
                else if (action === 'DELETE') syncToAnalytics('DELETE', 'INVENTORY', { id: params.args.where.id });
            } else if (params.model === 'Order') {
                if (['CREATE', 'UPDATE'].includes(action)) syncToAnalytics(action, 'ORDER', result);
            }
        } catch (e) {
            console.error('Sync middleware error', e);
        }
        return result;
    });
}

module.exports = { prisma, syncToAnalytics, runFullSync, registerPrismaMiddleware };
