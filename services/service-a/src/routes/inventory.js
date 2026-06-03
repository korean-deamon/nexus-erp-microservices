const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
    const items = await prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
});

router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    const item = await prisma.inventory.create({
        data: { ...req.body, quantity: parseInt(req.body.quantity), price: parseFloat(req.body.price) }
    });
    req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json(item);
});

router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const item = await prisma.inventory.update({
        where: { id: req.params.id },
        data: { ...req.body, quantity: parseInt(req.body.quantity), price: parseFloat(req.body.price) }
    });
    req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json(item);
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    await prisma.inventory.delete({ where: { id: req.params.id } });
    req.io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json({ success: true });
});

module.exports = router;
