const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const items = await prisma.basketItem.findMany({ where: { userId: req.user.id } });
        res.json(items);
    } catch (err) { res.status(500).json(err); }
});

router.post('/', authMiddleware, async (req, res) => {
    const { productId, name, price } = req.body;
    try {
        const product = await prisma.inventory.findUnique({ where: { id: productId } });
        if (!product || product.quantity <= 0) return res.status(400).json({ error: 'Out of stock' });

        await prisma.inventory.update({ where: { id: productId }, data: { quantity: { decrement: 1 } } });

        const existing = await prisma.basketItem.findFirst({ where: { userId: req.user.id, productId } });
        if (existing) {
            await prisma.basketItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + 1 } });
        } else {
            await prisma.basketItem.create({ data: { userId: req.user.id, productId, name, quantity: 1, price: parseFloat(price) } });
        }

        req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
        req.io.to(req.user.id).emit('notification', { type: 'BASKET', message: `Added to vault: ${name}`, time: new Date().toLocaleTimeString() });
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

router.post('/decrement', authMiddleware, async (req, res) => {
    const { productId } = req.body;
    try {
        const existing = await prisma.basketItem.findFirst({ where: { userId: req.user.id, productId } });
        if (!existing) return res.status(404).json({ error: 'Item not in basket' });

        await prisma.inventory.update({ where: { id: productId }, data: { quantity: { increment: 1 } } });
        if (existing.quantity > 1) {
            await prisma.basketItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity - 1 } });
        } else {
            await prisma.basketItem.delete({ where: { id: existing.id } });
        }

        req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

router.delete('/', authMiddleware, async (req, res) => {
    const items = await prisma.basketItem.findMany({ where: { userId: req.user.id } });
    for (const item of items) {
        await prisma.inventory.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
    }
    await prisma.basketItem.deleteMany({ where: { userId: req.user.id } });
    req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json({ success: true });
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const item = await prisma.basketItem.findUnique({ where: { id: req.params.id } });
    if (item) {
        await prisma.inventory.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
        await prisma.basketItem.delete({ where: { id: req.params.id } });
        req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    }
    res.json({ success: true });
});

module.exports = router;
