const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'nexus-secret';

prisma.$connect()
  .then(() => console.log('📡 Connected to Nexus DB'))
  .catch(err => console.error('❌ DB Connection Failed:', err));

app.use(cors());
app.use(express.json());

// Socket: Rooms
io.on('connection', (socket) => {
    socket.on('join', ({ userId, role }) => {
        socket.join(userId);
        if (role === 'ADMIN') {
            socket.join('ADMIN_ROOM');
            console.log(`👤 Admin joined room: ${userId}`);
        } else {
            console.log(`👤 User joined room: ${userId}`);
        }
        socket.join('GLOBAL_CHANNEL');
    });
});

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
};

const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') next();
    else res.status(403).json({ error: 'Admins only' });
};

// --- BASKET ---
app.get('/basket', authMiddleware, async (req, res) => {
    try {
        const items = await prisma.basketItem.findMany({ where: { userId: req.user.id } });
        res.json(items);
    } catch (err) { res.status(500).json(err); }
});

app.post('/basket', authMiddleware, async (req, res) => {
    const { productId, name, price } = req.body;
    try {
        const product = await prisma.inventory.findUnique({ where: { id: productId } });
        if (!product || product.quantity <= 0) return res.status(400).json({ error: 'Out of stock' });

        const existing = await prisma.basketItem.findFirst({
            where: { userId: req.user.id, productId: productId }
        });

        // 1. Update Inventory globally (decrement)
        await prisma.inventory.update({
            where: { id: productId },
            data: { quantity: { decrement: 1 } }
        });

        // 2. Update/Create Basket item
        if (existing) {
            await prisma.basketItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + 1 }
            });
        } else {
            await prisma.basketItem.create({
                data: { userId: req.user.id, productId, name, quantity: 1, price: parseFloat(price) }
            });
        }
        
        // 3. Notify everyone about Inventory change
        io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
        io.to(req.user.id).emit('notification', { 
            type: 'BASKET', message: `Added to vault: ${name}`, time: new Date().toLocaleTimeString() 
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

app.post('/basket/decrement', authMiddleware, async (req, res) => {
    const { productId } = req.body;
    try {
        const existing = await prisma.basketItem.findFirst({
            where: { userId: req.user.id, productId: productId }
        });
        if (existing) {
            // 1. Restore Inventory globally
            await prisma.inventory.update({
                where: { id: productId },
                data: { quantity: { increment: 1 } }
            });

            if (existing.quantity > 1) {
                await prisma.basketItem.update({
                    where: { id: existing.id },
                    data: { quantity: existing.quantity - 1 }
                });
            } else {
                await prisma.basketItem.delete({ where: { id: existing.id } });
            }
            
            io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Item not in basket' });
        }
    } catch (err) {
        console.error('Decrement Error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

app.delete('/basket', authMiddleware, async (req, res) => {
    const items = await prisma.basketItem.findMany({ where: { userId: req.user.id } });
    for (const item of items) {
        await prisma.inventory.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } }
        });
    }
    await prisma.basketItem.deleteMany({ where: { userId: req.user.id } });
    io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json({ success: true });
});

app.delete('/basket/:id', authMiddleware, async (req, res) => {
    const item = await prisma.basketItem.findUnique({ where: { id: req.params.id } });
    if (item) {
        await prisma.inventory.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } }
        });
        await prisma.basketItem.delete({ where: { id: req.params.id } });
        io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    }
    res.json({ success: true });
});

// --- CHECKOUT ---
app.post('/checkout', authMiddleware, async (req, res) => {
    const { paymentMethod } = req.body;
    if (paymentMethod === 'CARD') return res.status(400).json({ error: 'Card Payment is coming soon!' });

    try {
        const basketItems = await prisma.basketItem.findMany({ where: { userId: req.user.id } });
        if (basketItems.length === 0) return res.status(400).json({ error: 'Basket is empty' });

        for (const item of basketItems) {
            await prisma.order.create({
                data: {
                    userId: req.user.id,
                    productName: item.name,
                    quantity: item.quantity,
                    totalAmount: parseFloat(item.price) * item.quantity,
                    status: 'PENDING',
                    paymentMethod: 'CASH'
                }
            });
            // Inventory was already decremented during basket updates
        }

        await prisma.basketItem.deleteMany({ where: { userId: req.user.id } });

        io.to(req.user.id).emit('notification', { type: 'CHECKOUT', message: 'Order finalized!' });
        
        // Adminga xabar yuborish (Faqat Adminlar xonasiga)
        const orderSummary = basketItems.map(i => i.name).join(', ');
        const notificationData = { 
            type: 'ORDER_RECEIVED', 
            message: `${req.user.name || req.user.email} ordered: ${orderSummary}` 
        };
        
        console.log(`📣 NOTIFYING ADMINS: ${notificationData.message}`);
        io.to('ADMIN_ROOM').emit('notification', notificationData);

        res.json({ success: true });
    } catch (err) { res.status(500).json(err); }
});

app.patch('/orders/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({ where: { id: req.params.id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        // Security Check
        if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Prevent multiple refunds
        if (order.status === 'CANCELLED') return res.json(order);

        // Refund Inventory if possible
        try {
            const product = await prisma.inventory.findFirst({ where: { name: order.productName } });
            if (product) {
                await prisma.inventory.update({ 
                    where: { id: product.id }, 
                    data: { quantity: { increment: order.quantity } } 
                });
            }
        } catch (invErr) {
            console.error('Inventory refund failed:', invErr);
            // We continue even if refund fails, to allow cancellation
        }

        const updated = await prisma.order.update({ 
            where: { id: req.params.id }, 
            data: { 
                status: 'CANCELLED',
                cancelledBy: req.user.role // ADMIN yoki USER ekanini saqlaymiz
            } 
        });
        
        io.to(order.userId).emit('notification', { type: 'CANCEL', message: `Order #${order.id.substring(0,5)} cancelled.` });
        io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
        io.to('ADMIN_ROOM').emit('notification', { type: 'REFRESH_ORDERS' });
        
        res.json(updated);
    } catch (err) { 
        console.error('Cancel Order Error:', err);
        res.status(500).json({ error: 'Internal Server Error during cancellation' }); 
    }
});

// --- ORDERS ---
app.get('/orders', authMiddleware, async (req, res) => {
    const query = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };
    const orders = await prisma.order.findMany({ where: query, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
});

app.patch('/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.update({ 
            where: { id: req.params.id }, 
            data: { status: req.body.status } 
        });

        // Foydalanuvchiga xabar yuborish
        io.to(order.userId).emit('notification', { 
            type: 'STATUS_UPDATE', 
            message: `Your order #${order.id.substring(0,5)} is now ${req.body.status}!` 
        });

        // Adminga yangilanish xabari
        io.to('ADMIN_ROOM').emit('notification', { type: 'REFRESH_ORDERS' });

        res.json(order);
    } catch (err) { res.status(500).json(err); }
});

// --- INVENTORY ---
app.get('/inventory', async (req, res) => {
    const items = await prisma.inventory.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
});

app.post('/inventory', authMiddleware, adminMiddleware, async (req, res) => {
    const item = await prisma.inventory.create({ data: { ...req.body, quantity: parseInt(req.body.quantity), price: parseFloat(req.body.price) } });
    io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json(item);
});

app.put('/inventory/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const item = await prisma.inventory.update({
        where: { id: req.params.id },
        data: { ...req.body, quantity: parseInt(req.body.quantity), price: parseFloat(req.body.price) }
    });
    io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json(item);
});

app.delete('/inventory/:id', authMiddleware, adminMiddleware, async (req, res) => {
    await prisma.inventory.delete({ where: { id: req.params.id } });
    io.to('GLOBAL_CHANNEL').emit('notification', { type: 'REFRESH_INV' });
    res.json({ success: true });
});

// --- AUTH ---
app.post('/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashedPassword, name, role: 'USER' } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30m' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Wrong credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30m' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

server.listen(3005, '0.0.0.0', () => {
    console.log('🚀 Operations API @3005');
    console.log('📡 Listening on all interfaces (0.0.0.0)');
});
