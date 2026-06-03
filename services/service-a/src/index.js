const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { prisma, runFullSync, registerPrismaMiddleware } = require('./sync');
const authRoutes      = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const basketRoutes    = require('./routes/basket');
const orderRoutes     = require('./routes/orders');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// Attach io to every request so routes can emit socket events
app.use((req, res, next) => { req.io = io; next(); });

app.use(cors());
app.use(express.json());

// Register Prisma middleware for auto-sync to Analytics
registerPrismaMiddleware();

// Socket.io rooms
io.on('connection', (socket) => {
    socket.on('join', ({ userId, role }) => {
        socket.join(userId);
        socket.join('GLOBAL_CHANNEL');
        if (role === 'ADMIN') {
            socket.join('ADMIN_ROOM');
            console.log(`👤 Admin joined room: ${userId}`);
        } else {
            console.log(`👤 User joined room: ${userId}`);
        }
    });
});

// Routes
app.use('/auth',      authRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/basket',    basketRoutes);
app.use('/',          orderRoutes);   // covers /orders, /checkout, /orders/:id/*

// DB connect + full sync on startup
prisma.$connect()
    .then(() => {
        console.log('📡 Connected to Nexus DB');
        setTimeout(runFullSync, 5000);
    })
    .catch(err => console.error('❌ DB Connection Failed:', err));

server.listen(3005, '0.0.0.0', () => {
    console.log('🚀 Operations API @3005');
    console.log('📡 Listening on all interfaces (0.0.0.0)');
});
