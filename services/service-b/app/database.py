from sqlalchemy import create_engine, Column, Integer, String, Numeric, MetaData, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import time
import sys

# Loglarni terminalga darhol chiqarish uchun
def log(msg):
    print(f"[DB-INIT] {msg}", flush=True)

DATABASE_URL = os.getenv("DATABASE_URL").split('?')[0]

engine = create_engine(
    DATABASE_URL, 
    connect_args={"options": "-csearch_path=analytics,public"}
)

# Muhim: Shemani aniqlaymiz
metadata = MetaData(schema="analytics")
Base = declarative_base(metadata=metadata)

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    sku = Column(String, unique=True)
    quantity = Column(Integer)
    price = Column(Numeric)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Seeding funksiyasi
def seed_data():
    session = SessionLocal()
    count = session.query(Inventory).count()
    if count == 0:
        log("Seed: Populating initial inventory...")
        items = [
            Inventory(name="MacBook Pro M3 Max", sku="NXS-APL-01", quantity=15, price=4299),
            Inventory(name="SuperMicro Server X12", sku="NXS-SRV-92", quantity=4, price=12490),
            Inventory(name="Dell Precision 7960", sku="NXS-DEL-44", quantity=8, price=8990)
        ]
        session.add_all(items)
        session.commit()
        log("Seed: Inventory populated.")
    session.close()

def init_db():
    log("Starting database initialization...")
    retry_count = 5
    while retry_count > 0:
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS analytics;"))
                conn.commit()
                Base.metadata.create_all(bind=engine)
                log("Database tables verified.")
                seed_data()
                return
        except Exception as e:
            log(f"Attempt failed: {e}. Retrying in 5s...")
            time.sleep(5)
            retry_count -= 1
    log("Could not initialize database after multiple retries.")
