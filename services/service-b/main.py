import strawberry
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from typing import List, Optional
from decimal import Decimal
import psycopg2
import os

# Database connection setup
def get_db_connection():
    url = os.getenv("DATABASE_URL", "postgresql://admin:password@postgres:5432/nexus_erp")
    if "?" in url:
        url = url.split("?")[0]
    return psycopg2.connect(url)

@strawberry.type
class OrderType:
    id: strawberry.ID
    userId: str
    productName: str
    totalAmount: str
    status: str
    createdAt: str

@strawberry.type
class UserType:
    id: strawberry.ID
    email: str
    role: str

    @strawberry.field
    def orders(self) -> List[OrderType]:
        conn = get_db_connection()
        cur = conn.cursor()
        # Foydalanuvchining barcha buyurtmalarini ID orqali olish
        cur.execute('SELECT id, "userId", "productName", "totalAmount", status, "createdAt" FROM operations."Order" WHERE "userId" = %s', (self.id,))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [OrderType(id=r[0], userId=r[1], productName=r[2], totalAmount=str(r[3]), status=r[4], createdAt=str(r[5])) for r in rows]

@strawberry.type
class InventoryItem:
    name: str
    sku: str
    quantity: int
    price: Decimal

# Queries
@strawberry.type
class Query:
    @strawberry.field
    def inventory(self) -> List[InventoryItem]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT name, sku, quantity, price FROM operations."Inventory"')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [InventoryItem(name=r[0], sku=r[1], quantity=r[2], price=Decimal(str(r[3]))) for r in rows]

    @strawberry.field
    def users(self) -> List[UserType]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT id, email, role FROM operations."User"')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [UserType(id=r[0], email=r[1], role=r[2]) for r in rows]

    @strawberry.field
    def orders(self) -> List[OrderType]:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('SELECT id, "userId", "productName", "totalAmount", status, "createdAt" FROM operations."Order" ORDER BY "createdAt" DESC')
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [OrderType(id=r[0], userId=r[1], productName=r[2], totalAmount=str(r[3]), status=r[4], createdAt=str(r[5])) for r in rows]

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)

app = FastAPI(title="Nexus ERP - Advanced GraphQL Analytics")
app.include_router(graphql_app, prefix="/graphql")

@app.get("/")
def read_root():
    return {"service": "Nexus Analytics", "graphql": "/graphql"}
