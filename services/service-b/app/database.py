import os
import time
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:password@postgres-analytics:5432/analytics_db").split("?")[0]

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    print("[DB] Starting database initialization...", flush=True)
    retry_count = 5
    while retry_count > 0:
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE TABLE IF NOT EXISTS \"User\" (id VARCHAR PRIMARY KEY, email VARCHAR, role VARCHAR);"))
                conn.execute(text("CREATE TABLE IF NOT EXISTS \"Inventory\" (id VARCHAR PRIMARY KEY, name VARCHAR, sku VARCHAR, quantity INTEGER, price NUMERIC);"))
                conn.execute(text("CREATE TABLE IF NOT EXISTS \"Order\" (id VARCHAR PRIMARY KEY, \"userId\" VARCHAR, \"productName\" VARCHAR, \"totalAmount\" NUMERIC, status VARCHAR, \"createdAt\" TIMESTAMP);"))
                conn.commit()
                print("[DB] Tables verified.", flush=True)
                return
        except Exception as e:
            print(f"[DB] Attempt failed: {e}. Retrying in 5s...", flush=True)
            time.sleep(5)
            retry_count -= 1
    print("[DB] Could not initialize database after multiple retries.", flush=True)
