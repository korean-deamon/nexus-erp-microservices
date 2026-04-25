from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from contextlib import asynccontextmanager
from .graphql.schema import schema
from .database import init_db
import sys

# Lifespan - dastur ishga tushganda bajariladigan qism
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dastur ishga tushganda:
    print("[SYSTEM] Starting Nexus Analytics Service...", flush=True)
    init_db()
    yield
    # Dastur to'xtaganda (ixtiyoriy):
    print("[SYSTEM] Stopping Service...", flush=True)

app = FastAPI(title="Nexus Analytics Service", lifespan=lifespan)

app.include_router(GraphQLRouter(schema), prefix="/graphql")

@app.get("/")
def read_root():
    return {"status": "Analytics Service Active", "node": "Python 3.11"}
