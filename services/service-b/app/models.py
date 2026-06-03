from sqlalchemy import Column, String, Integer, Numeric, DateTime
from .database import Base


class AnalyticsUser(Base):
    __tablename__ = "User"
    id    = Column(String, primary_key=True)
    email = Column(String)
    role  = Column(String)


class AnalyticsInventory(Base):
    __tablename__ = "Inventory"
    id       = Column(String, primary_key=True)
    name     = Column(String)
    sku      = Column(String)
    quantity = Column(Integer)
    price    = Column(Numeric)


class AnalyticsOrder(Base):
    __tablename__ = "Order"
    id          = Column(String, primary_key=True)
    userId      = Column(String)
    productName = Column(String)
    totalAmount = Column(Numeric)
    status      = Column(String)
    createdAt   = Column(DateTime)
