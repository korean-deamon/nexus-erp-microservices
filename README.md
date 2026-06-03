# Nexus ERP: Universal Operational Suite (v4.0)

Enterprise-grade ERP system built on a microservices architecture. Features real-time stock synchronization, GraphQL analytics, JWT authentication, Socket.io live notifications, and a dedicated mobile app (Expo).

## Key Features

- **Microservices Architecture** — Docker Compose: Node.js (Operations), Python (Analytics), Nginx (Gateway), Redis
- **Database-per-Service** — Isolated PostgreSQL instances for Operations and Analytics
- **Real-time Engine** — Socket.io: live inventory updates, order notifications, admin alerts with sound
- **GraphQL Analytics** — Python/FastAPI/Strawberry serving revenue, order count, user data
- **JWT Auth** — bcrypt password hashing, role-based access (ADMIN / USER)
- **Modular Codebase** — All services split into focused files (routes, middleware, components, hooks)
- **Aesthetic UI** — Aurora CSS background, gradient text, glow cards, page transitions, glassmorphism
- **Mobile App** — Expo/React Native with SecureStore, vibration notifications, same API

## System Architecture

```
User / Browser / Mobile
        ↓
NGINX Gateway (port 8080)
  /              → Frontend    (Next.js  :3000)
  /api/v1/*      → Service-A   (Node.js  :3005)
  /socket.io/    → Service-A   (WebSocket)
  /api/v2/graphql→ Service-B   (Python   :8000)
        ↓
  Service-A ──sync──→ Service-B
  PostgreSQL DB-1     PostgreSQL DB-2
  (operations_db)     (analytics_db)
        ↓
      Redis
```

## Project Structure

```
final/
├── docker-compose.yml
├── .env
├── infra/gateway/nginx.conf
│
├── services/
│   ├── service-a/                  Node.js Operations API
│   │   ├── prisma/
│   │   │   ├── schema.prisma       DB schema (User, Inventory, Order, BasketItem)
│   │   │   └── seed.js             Initial data (admin + inventory)
│   │   └── src/
│   │       ├── index.js            App entry (40 lines)
│   │       ├── sync.js             Analytics sync + Prisma middleware
│   │       ├── middleware/auth.js  JWT authMiddleware + adminMiddleware
│   │       └── routes/
│   │           ├── auth.js         POST /auth/login, /register, GET /auth/users
│   │           ├── inventory.js    GET/POST/PUT/DELETE /inventory
│   │           ├── basket.js       GET/POST/DELETE /basket
│   │           └── orders.js       GET /orders, POST /checkout, PATCH status/cancel
│   │
│   └── service-b/                  Python Analytics API
│       └── app/
│           ├── main.py             FastAPI entry (20 lines)
│           ├── database.py         DB connection + init
│           ├── models.py           SQLAlchemy models
│           ├── sync.py             POST /internal/sync handler
│           └── graphql/schema.py   Strawberry GraphQL (inventory, users, orders, revenue)
│
└── apps/
    ├── frontend/                   Next.js Web Dashboard
    │   └── src/
    │       ├── app/
    │       │   ├── page.tsx        Main orchestrator (state + handlers)
    │       │   ├── layout.tsx      HTML wrapper
    │       │   └── globals.css     Aurora bg, glassmorphism, transitions
    │       ├── types/index.ts      TypeScript types
    │       ├── utils/helpers.ts    getStatusColor, groupOrders
    │       └── components/
    │           ├── auth/           AuthModal
    │           ├── layout/         Sidebar, MobileHeader, BottomNav, PageHeader
    │           ├── dashboard/      Dashboard (stats, charts)
    │           ├── inventory/      InventoryView, InventoryModal
    │           ├── orders/         OrdersView (filters, user avatars, status actions)
    │           ├── vault/          VaultSidebar (basket + checkout)
    │           └── ui/             Toast, QuantitySelector, BackgroundScene
    │
    └── mobile/                     Expo React Native App
        └── App.js                  Full mobile UI (SecureStore, vibration, GraphQL)
```

## Quick Start

```bash
# 1. Start all services
docker compose up -d

# 2. Open in browser (first load ~30s compile)
http://localhost:8080

# Default admin credentials
Email:    admin@nexus.local
Password: admin123
```

## Mobile App

```bash
cd apps/mobile
npm install

# Set your machine's local IP in apps/mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080

npx expo start -c --offline
```

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/login | — | Login, returns JWT |
| POST | /api/v1/auth/register | — | Register new user |
| GET | /api/v1/inventory | — | List all products |
| POST | /api/v1/basket | User | Add item to cart |
| POST | /api/v1/checkout | User | Place order |
| GET | /api/v1/orders | User/Admin | List orders |
| PATCH | /api/v1/orders/:id/status | Admin | Update order status |
| POST | /api/v2/graphql | — | GraphQL analytics |

## Order Status Flow

```
PENDING → SHIPPED → DELIVERED → COMPLETED
    ↓                   ↓             ↓
  CANCELLED          CANCELLED    (final)
```

## Default Ports

| Port | Service |
|------|---------|
| 8080 | Nginx Gateway (main entry) |
| 3000 | Frontend (direct) |
| 3001 | Service-A (direct) |
| 8000 | Service-B (direct) |
| 5433 | PostgreSQL operations_db |
| 5434 | PostgreSQL analytics_db |
| 6380 | Redis |

---
*BTEC APP Final — Nexus Operational Protocol v4.0*
