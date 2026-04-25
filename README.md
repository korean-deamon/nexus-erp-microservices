# 🛡️ Nexus ERP: Microservices Pro Edition

A high-performance, enterprise-grade ERP system built on a microservices architecture. Featuring real-time stock synchronization, advanced analytics, and a premium "Nexus Pro" visual interface.

## 🚀 Key Features

- **Microservices Architecture**: Orchestrated via Docker Compose with Node.js, Python, Nginx, PostgreSQL, and Redis.
- **Real-time Inventory Locking**: Integrated Socket.io logic that books stock items immediately when added to a user's vault, preventing over-selling in real-time.
- **Nexus Pro UI/UX**: State-of-the-art interface featuring Glassmorphism effects, Framer-style animations, and high-fidelity design tokens.
- **Advanced Analytics Hub**: Relational data resolution using GraphQL (Python/Strawberry) for deep business intelligence.
- **Dual-Role Interface**: Tailored experiences for Admins (Operations Control) and Users (Strategic Procurement).
- **Mobile-First Design**: Fully responsive navigation with a dedicated mobile dock for seamless operation on any device.

## 🏗️ System Architecture

```text
                                 ╔════════════════════════╗
                                 ║   USER / WEB BROWSER   ║
                                 ╚══════════╦═════════════╝
                                            ║
                                            ▼ (HTTP/WebSocket)
       ┌──────────────────────────────────────────────────────────────────────────┐
       │                        NGINX API GATEWAY (Port 8080)                     │
       │           (Central Routing, Load Balancing & SSL Termination)            │
       └─────┬──────────────────────────────┬──────────────────────────────┬──────┘
             │                              │                              │
             ▼ (/)                          ▼ (/api/v1)                    ▼ (/graphql)
   ╔══════════════════╗           ╔══════════════════╗           ╔══════════════════╗
   ║  FRONTEND APP    ║           ║  OPERATIONS API  ║           ║  ANALYTICS HUB   ║
   ║    (Next.js)     ║           ║    (Node.js)     ║           ║     (Python)     ║
   ╠══════════════════╣           ╠══════════════════╣           ╠══════════════════╣
   ║ - React UI       ║           ║ - JWT Auth       ║           ║ - GraphQL Schema ║
   ║ - State Mgmt     ║           ║ - Order Logic    ║           ║ - Data Mining    ║
   ║ - Socket Client  ║           ║ - Socket.io Serv ║           ║ - FastAPI Engine ║
   ╚═════════╦════════╝           ╚════════╦═════════╝           ╚════════╦═════════╝
             ║                             ║                              ║
             ╚══════════════╦══════════════╩══════════════╦═══════════════╝
                            ║                             ║
                            ▼                             ▼
                 ┌───────────────────┐         ┌───────────────────┐
                 │   POSTGRESQL DB   │         │    REDIS CACHE    │
                 │ (Relational Data) │         │ (Real-time Sync)  │
                 └───────────────────┘         └───────────────────┘
```

## 📂 Project Structure

```text
final/
├── apps/
│   └── frontend/          # Next.js 14 Pro Dashboard (UI/UX)
├── services/
│   ├── service-a/         # Operations Microservice (Node.js/Prisma)
│   ├── service-b/         # Analytics Microservice (Python/FastAPI/GraphQL)
│   └── gateway/           # API Gateway (Nginx Reverse Proxy)
├── docker-compose.yml     # Container Orchestration
└── .env                   # Security & Environment Config
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons, Socket.io-client.
- **Backend A (Ops)**: Node.js, Express, Prisma ORM, Socket.io, JWT.
- **Backend B (Analytics)**: Python 3.10+, FastAPI, Strawberry GraphQL, Psycopg2.
- **Infrastructure**: Nginx (Gateway), Redis (Real-time Cache), PostgreSQL (Relational DB).
- **DevOps**: Docker, Docker Compose.

## 🚥 Quick Start

1. **Environment Setup**:
   Copy `.env.example` to `.env` and configure your credentials.

2. **Launch Containers**:
   ```bash
   docker-compose up -d --build
   ```

3. **Database Migration**:
   ```bash
   docker-compose exec service-operations npx prisma db push
   ```

4. **Access Portal**:
   - Frontend: `http://localhost:8080`
   - GraphQL Playground: `http://localhost:8080/graphql`

## 📊 Operations Guide

- **Inventory Locking**: When a user increments an item in their vault, the global stock decrements instantly across all connected clients.
- **Admin Control**: Admins can approve shipments, manage assets, and view global revenue matrices in the Control Center.
- **Analytics**: Use the GraphQL hub for complex queries across users and their transaction history.

---
*Developed for BTEC APP Final - Nexus Operational Protocol v2.0*
