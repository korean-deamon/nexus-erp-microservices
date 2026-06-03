from fastapi import FastAPI, Request
from strawberry.fastapi import GraphQLRouter
from contextlib import asynccontextmanager
from .graphql.schema import schema
from .database import init_db
from .sync import sync_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[SYSTEM] Starting Nexus Analytics Service...", flush=True)
    init_db()
    yield
    print("[SYSTEM] Stopping Service...", flush=True)


app = FastAPI(title="Nexus Analytics Service", lifespan=lifespan)

app.include_router(GraphQLRouter(schema), prefix="/graphql")


@app.post("/internal/sync")
async def internal_sync(request: Request):
    return await sync_data(request)


@app.get("/")
def read_root():
    return {"service": "Nexus Analytics", "graphql": "/graphql"}
