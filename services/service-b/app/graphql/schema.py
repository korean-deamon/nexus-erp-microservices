import strawberry
from typing import List
from decimal import Decimal
from datetime import datetime
from ..database import SessionLocal
from ..models import AnalyticsUser, AnalyticsInventory, AnalyticsOrder


@strawberry.type
class OrderType:
    id:          strawberry.ID
    userId:      str
    productName: str
    totalAmount: str
    status:      str
    createdAt:   str

    @staticmethod
    def from_db(o: AnalyticsOrder) -> "OrderType":
        return OrderType(id=o.id, userId=o.userId, productName=o.productName,
                         totalAmount=str(o.totalAmount), status=o.status, createdAt=str(o.createdAt))


@strawberry.type
class UserType:
    id:    strawberry.ID
    email: str
    role:  str

    @strawberry.field
    def orders(self) -> List[OrderType]:
        db = SessionLocal()
        rows = db.query(AnalyticsOrder).filter(AnalyticsOrder.userId == self.id).all()
        db.close()
        return [OrderType.from_db(o) for o in rows]


@strawberry.type
class InventoryItem:
    name:     str
    sku:      str
    quantity: int
    price:    Decimal


@strawberry.type
class Query:
    @strawberry.field
    def inventory(self) -> List[InventoryItem]:
        db = SessionLocal()
        rows = db.query(AnalyticsInventory).all()
        db.close()
        return [InventoryItem(name=i.name, sku=i.sku, quantity=i.quantity, price=i.price) for i in rows]

    @strawberry.field
    def users(self) -> List[UserType]:
        db = SessionLocal()
        rows = db.query(AnalyticsUser).all()
        db.close()
        return [UserType(id=u.id, email=u.email, role=u.role) for u in rows]

    @strawberry.field
    def orders(self) -> List[OrderType]:
        db = SessionLocal()
        rows = db.query(AnalyticsOrder).order_by(AnalyticsOrder.createdAt.desc()).all()
        db.close()
        return [OrderType.from_db(o) for o in rows]

    @strawberry.field
    def revenue(self) -> float:
        db = SessionLocal()
        rows = db.query(AnalyticsOrder).filter(AnalyticsOrder.status == "COMPLETED").all()
        db.close()
        return sum(float(o.totalAmount) for o in rows)

    @strawberry.field
    def order_count(self) -> int:
        db = SessionLocal()
        count = db.query(AnalyticsOrder).count()
        db.close()
        return count


schema = strawberry.Schema(query=Query)
