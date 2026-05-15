import os
from datetime import datetime
from typing import List, Optional
from decimal import Decimal
import strawberry
from fastapi import FastAPI, Request
from strawberry.fastapi import GraphQLRouter
from sqlalchemy import create_engine, Column, String, Integer, Numeric, DateTime, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:password@postgres-analytics:5432/analytics_db")
db_url = DATABASE_URL.split("?")[0]
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class AnalyticsUser(Base):
    __tablename__ = "User"
    id = Column(String, primary_key=True)
    email = Column(String)
    role = Column(String)

class AnalyticsInventory(Base):
    __tablename__ = "Inventory"
    id = Column(String, primary_key=True)
    name = Column(String)
    sku = Column(String)
    quantity = Column(Integer)
    price = Column(Numeric)

class AnalyticsOrder(Base):
    __tablename__ = "Order"
    id = Column(String, primary_key=True)
    userId = Column(String)
    productName = Column(String)
    totalAmount = Column(Numeric)
    status = Column(String)
    createdAt = Column(DateTime)

# Create tables in the analytics schema
Base.metadata.create_all(bind=engine)

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
        db = SessionLocal()
        orders = db.query(AnalyticsOrder).filter(AnalyticsOrder.userId == self.id).all()
        db.close()
        return [OrderType(
            id=o.id, userId=o.userId, productName=o.productName,
            totalAmount=str(o.totalAmount), status=o.status, createdAt=str(o.createdAt)
        ) for o in orders]

@strawberry.type
class InventoryItem:
    name: str
    sku: str
    quantity: int
    price: Decimal

@strawberry.type
class Query:
    @strawberry.field
    def inventory(self) -> List[InventoryItem]:
        db = SessionLocal()
        items = db.query(AnalyticsInventory).all()
        db.close()
        return [InventoryItem(name=i.name, sku=i.sku, quantity=i.quantity, price=i.price) for i in items]

    @strawberry.field
    def users(self) -> List[UserType]:
        db = SessionLocal()
        users = db.query(AnalyticsUser).all()
        db.close()
        return [UserType(id=u.id, email=u.email, role=u.role) for u in users]

    @strawberry.field
    def orders(self) -> List[OrderType]:
        db = SessionLocal()
        orders = db.query(AnalyticsOrder).order_by(AnalyticsOrder.createdAt.desc()).all()
        db.close()
        return [OrderType(
            id=o.id, userId=o.userId, productName=o.productName,
            totalAmount=str(o.totalAmount), status=o.status, createdAt=str(o.createdAt)
        ) for o in orders]

    @strawberry.field
    def revenue(self) -> float:
        db = SessionLocal()
        total = db.query(AnalyticsOrder).filter(AnalyticsOrder.status == 'COMPLETED').all()
        db.close()
        return sum(float(o.totalAmount) for o in total)

    @strawberry.field
    def order_count(self) -> int:
        db = SessionLocal()
        count = db.query(AnalyticsOrder).count()
        db.close()
        return count

schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema)

app = FastAPI(title="Nexus ERP - Advanced GraphQL Analytics")
app.include_router(graphql_app, prefix="/graphql")

@app.post("/internal/sync")
async def sync_data(request: Request):
    data = await request.json()
    action = data.get("action")
    entity = data.get("entity")
    payload = data.get("payload", {})
    
    db = SessionLocal()
    try:
        if action == "FULL_SYNC":
            db.query(AnalyticsOrder).delete()
            db.query(AnalyticsInventory).delete()
            db.query(AnalyticsUser).delete()
            
            for u in payload.get("users", []):
                db.add(AnalyticsUser(id=u["id"], email=u["email"], role=u["role"]))
            for i in payload.get("inventory", []):
                db.add(AnalyticsInventory(id=i["id"], name=i["name"], sku=i.get("sku", "N/A"), quantity=i["quantity"], price=i["price"]))
            for o in payload.get("orders", []):
                dt = datetime.fromisoformat(o["createdAt"].replace('Z', '+00:00')) if isinstance(o["createdAt"], str) else o["createdAt"]
                db.add(AnalyticsOrder(id=o["id"], userId=o["userId"], productName=o["productName"], totalAmount=o["totalAmount"], status=o["status"], createdAt=dt))
                
        elif entity == "USER" and action == "CREATE":
            db.merge(AnalyticsUser(id=payload["id"], email=payload["email"], role=payload["role"]))
            
        elif entity == "INVENTORY":
            if action in ["CREATE", "UPDATE"]:
                db.merge(AnalyticsInventory(id=payload["id"], name=payload["name"], sku=payload.get("sku", "N/A"), quantity=payload["quantity"], price=payload["price"]))
            elif action == "DELETE":
                db.query(AnalyticsInventory).filter_by(id=payload["id"]).delete()
                
        elif entity == "ORDER" and action in ["CREATE", "UPDATE"]:
            dt = datetime.fromisoformat(payload["createdAt"].replace('Z', '+00:00')) if isinstance(payload["createdAt"], str) else payload["createdAt"]
            db.merge(AnalyticsOrder(id=payload["id"], userId=payload["userId"], productName=payload["productName"], totalAmount=payload["totalAmount"], status=payload["status"], createdAt=dt))
            
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        print(f"Sync error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"service": "Nexus Analytics", "graphql": "/graphql"}


