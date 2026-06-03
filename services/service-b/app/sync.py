from datetime import datetime
from fastapi import Request
from .database import SessionLocal
from .models import AnalyticsUser, AnalyticsInventory, AnalyticsOrder


async def sync_data(request: Request):
    data    = await request.json()
    action  = data.get("action")
    entity  = data.get("entity")
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
                dt = datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00")) if isinstance(o["createdAt"], str) else o["createdAt"]
                db.add(AnalyticsOrder(id=o["id"], userId=o["userId"], productName=o["productName"], totalAmount=o["totalAmount"], status=o["status"], createdAt=dt))

        elif entity == "USER" and action == "CREATE":
            db.merge(AnalyticsUser(id=payload["id"], email=payload["email"], role=payload["role"]))

        elif entity == "INVENTORY":
            if action in ["CREATE", "UPDATE"]:
                db.merge(AnalyticsInventory(id=payload["id"], name=payload["name"], sku=payload.get("sku", "N/A"), quantity=payload["quantity"], price=payload["price"]))
            elif action == "DELETE":
                db.query(AnalyticsInventory).filter_by(id=payload["id"]).delete()

        elif entity == "ORDER" and action in ["CREATE", "UPDATE"]:
            dt = datetime.fromisoformat(payload["createdAt"].replace("Z", "+00:00")) if isinstance(payload["createdAt"], str) else payload["createdAt"]
            db.merge(AnalyticsOrder(id=payload["id"], userId=payload["userId"], productName=payload["productName"], totalAmount=payload["totalAmount"], status=payload["status"], createdAt=dt))

        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        print(f"Sync error: {e}", flush=True)
        return {"success": False, "error": str(e)}
    finally:
        db.close()
