const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/orders', authMiddleware, async (req, res) => {
    const query = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
    const orders = await prisma.order.findMany({
        where: query,
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
});

router.post('/checkout', authMiddleware, async (req, res) => {
    const { paymentMethod } = req.body;
    if (paymentMethod === 'CARD') return res.status(400).json({ error: 'Card Payment is coming soon!' });
    try {
        const basketItems = await prisma.basketItem.findMany({ where: { userId: req.user.id } });
        if (basketItems.length === 0) return res.status(400).json({ error: 'Basket is empty' });

        for (const item of basketItems) {
            await prisma.order.create({
                data: { userId: req.user.id, productName: item.name, quantity: item.quantity, totalAmount: Number(item.price) * item.quantity, status: 'PENDING', paymentMethod: 'CASH' }
            });
        }

        const total = basketItems.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0);
        await prisma.basketItem.deleteMany({ where: { userId: req.user.id } });

        req.io.to(req.user.id).emit('notification', { type: 'CHECKOUT', message: 'Order finalized!' });

        const summary = basketItems.map(i => i.name).join(', ');
        const name = req.user.name || req.user.email;
        req.io.to('ADMIN_ROOM').emit('notification', { type: 'ORDER_RECEIVED', message: `${name} placed a new order ($${total.toFixed(2)}). Items: ${summary}` });
        req.io.to('ADMIN_ROOM').emit('notification', { type: 'REFRESH_ORDERS' });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: `Checkout Protocol Failure: ${err.message}` });
    }
});

router.patch('/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.update({ where: { id: req.params.id }, data: { status: req.body.status } });
        req.io.to(order.userId).emit('notification', { type: 'STATUS_UPDATE', message: `Your order #${order.id.substring(0, 5)} is now ${req.body.status}!` });
        req.io.to('ADMIN_ROOM').emit('notification', { type: 'REFRESH_ORDERS' });
        res.json(order);
    } catch (err) { res.status(500).json(err); }
});

router.patch('/orders/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
        if (order.status === 'CANCELLED') return res.json(order);

        try {
            const product = await prisma.inventory.findFirst({ where: { name: order.productName } });
            if (product) await prisma.inventory.update({ where: { id: product.id }, data: { quantity: { increment: order.quantity } } });
        } catch {}

        const updated = await prisma.order.update({ where: { id: req.params.id }, data: { status: 'CANCELLED', cancelledBy: req.user.role } });

        req.io.to(order.userId).emit('notification', { type: 'CANCEL', message: `Order #${order.id.substring(0, 5)} cancelled.` });
        req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });

        const msg = req.user.role === 'USER' ? `User cancelled order #${order.id.substring(0, 5)}` : `Order #${order.id.substring(0, 5)} cancelled by admin.`;
        req.io.to('ADMIN_ROOM').emit('notification', { type: 'ORDER_CANCELLED', message: msg });
        req.io.to('ADMIN_ROOM').emit('notification', { type: 'REFRESH_ORDERS' });

        res.json(updated);
    } catch (err) { res.status(500).json({ error: 'Internal Server Error during cancellation' }); }
});

module.exports = router;
