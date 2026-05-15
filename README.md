# 🛡️ Nexus ERP: Universal Operational Suite (v3.0)

A high-performance, enterprise-grade ERP system built on a microservices architecture. Featuring real-time stock synchronization, advanced analytics, a premium "Nexus Pro" visual interface, and a **dedicated mobile application (Expo SDK 51)** for field operations.

## 🚀 Key Features

- **Microservices Architecture**: Orchestrated via Docker Compose with Node.js (Operations), Python (Analytics), Nginx (Gateway), and Redis.
- **Database-per-Service Pattern**: Isolated PostgreSQL instances for Operations and Analytics to ensure data sovereignty and service autonomy.
- **Dedicated Mobile App**: Built with Expo/React Native, featuring real-time push notifications, vibration feedback, and role-based filtering.
- **Real-time Inventory Hub**: Integrated Socket.io logic that synchronize stock items immediately across Web and Mobile platforms.
- **Advanced Control Center**: Multi-tier filtering (Status & User) with dynamic count badges for rapid administrative triage.
- **Nexus Pro UI/UX**: State-of-the-art interface featuring Glassmorphism, dark-mode optimization, and high-fidelity design tokens.
- **Audit-Ready Protocols**: Detailed order tracking including "Cancelled By [Role]" logic and historical state persistence.

## 🏗️ System Architecture (Isolated Database Pattern)

```text
                                 ╔═══════════════════════════════════════╗
                                 ║   USER / WEB BROWSER / MOBILE APP     ║
                                 ╚═══════════════╦═══════════════════════╝
                                                 ║
                                                 ▼ (HTTP/WebSocket/GraphQL)
        ┌──────────────────────────────────────────────────────────────────────────┐
        │                        NGINX API GATEWAY (Port 8080)                     │
        └─────┬──────────────────────────────┬──────────────────────────────┬──────┘
              │                              │                              │
              ▼ (/)                          ▼ (/api/v1)                    ▼ (/api/v2/graphql)
    ╔══════════════════╗           ╔══════════════════╗           ╔══════════════════╗
    ║  FRONTEND WEB    ║           ║  OPERATIONS API  ║           ║  ANALYTICS HUB   ║
    ║    (Next.js)     ║           ║    (Node.js)     ║           ║     (Python)     ║
    ╠══════════════════╣           ╠══════════════════╣           ╠══════════════════╣
    ║ - Admin Dashboard║           ║ - CRUD Business  ║           ║ - GraphQL Query  ║
    ║ - Socket Client  ║           ║ - Socket.io Serv ║           ║ - Data Mining    ║
    ╚══════════════════╝           ╚════════╦═════════╝           ╚════════╦═════════╝
                                            ║                              ║
                                            ║        EVENT SYNC            ║
                                            ╚═════════════════════════════▶║
                                            ║                              ║
              DB 1 (Operations)             ║              DB 2 (Analytics)║
             .───────────────.              ║             .───────────────.
            |      DB       |◀══════════════╝            |      DB       |◀══════╝
            :───────────────:                            :───────────────:
            | operations_db |                            | analytics_db  |
            :               :                            :               :
             '─────────────'                              '─────────────'
               (Port 5433)                                  (Port 5434)
```

## 📂 Project Structure

```text
final/
├── apps/
│   ├── frontend/          # Next.js 14 Pro Dashboard (Web)
│   └── mobile/            # Expo / React Native App (iOS/Android)
├── services/
│   ├── service-a/         # Operations Microservice (Node.js/Prisma) -> DB 1
│   ├── service-b/         # Analytics Microservice (Python/FastAPI) -> DB 2
│   └── gateway/           # API Gateway (Nginx Reverse Proxy)
├── docker-compose.yml     # Container Orchestration (Isolated DBs)
└── .env                   # Global Security & Environment Config
```

## 🚥 Quick Start Guide

### 1. Backend & Web (Infrastructure)
1. **Configure Environment**: Copy `.env.example` to `.env`. Ensure `DATABASE_URL` is set.
2. **Launch Containers**:
   ```bash
   docker-compose up -d --build
   ```
3. **Initialize Database**:
   ```bash
   docker-compose exec service-operations npx prisma db push
   ```

### 2. Mobile Application (Expo SDK 51)
1. **Navigate to App**: `cd apps/mobile`
2. **Install Dependencies**: `npm install`
3. **Set Environment**: Ensure `EXPO_PUBLIC_API_URL` in `.env` points to your machine's local IP (e.g., `http://192.168.1.10:8080`).
4. **Launch with Cache Clear**:
   ```bash
   npx expo start -c --offline
   ```

## 📊 Operations Guide

- **Status Filters**: Both Web and Mobile allow filtering orders by PENDING, SHIPPED, DELIVERED, etc.
- **Admin Control**: Admins can approve shipments, manage assets, and view active order counts per user.
- **Notification Engine**: Real-time sound/vibration alerts for new orders and status updates across all connected devices.
- **Smart Checkout**: Stock is validated and locked at the moment of adding to the basket to prevent protocol conflicts.

---
*Developed for BTEC APP Final - Nexus Operational Protocol v3.0 (Full Release)*
