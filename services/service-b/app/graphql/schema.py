import strawberry
from typing import List, Optional
from decimal import Decimal

@strawberry.type
class InventoryItem:
    id: strawberry.ID
    name: str
    sku: str
    quantity: int
    price: Decimal

@strawberry.type
class AnalyticsLog:
    id: strawberry.ID
    event: str
    timestamp: str

@strawberry.type
class Query:
    @strawberry.field
    def inventory(self) -> List[InventoryItem]:
        return [
            InventoryItem(
                id=strawberry.ID("1"),
                name="MacBook Pro",
                sku="MBP-2024",
                quantity=10,
                price=Decimal("1999.99")
            )
        ]

@strawberry.type
class Mutation:
    @strawberry.mutation
    def update_stock(self, sku: str, quantity: int) -> InventoryItem:
        return InventoryItem(
            id=strawberry.ID("1"),
            name="Updated Item",
            sku=sku,
            quantity=quantity,
            price=Decimal("0.00")
        )

schema = strawberry.Schema(query=Query, mutation=Mutation)
