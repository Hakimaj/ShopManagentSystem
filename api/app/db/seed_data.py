from datetime import datetime, timezone, timedelta
from decimal import Decimal

SEED_USERS = [
    {
        "username": "admin",
        "email": "admin@cleancare.com",
        "full_name": "Shop Admin",
        "role": "ADMIN",
        "password": "admin123"
    },
    {
        "username": "staff",
        "email": "staff@cleancare.com",
        "full_name": "Cashier Staff",
        "role": "STAFF",
        "password": "staff123"
    }
]

SEED_CATEGORIES = [
    {"name": "Laundry & Cleaning"},
    {"name": "Personal Care"},
    {"name": "Hair Care"},
    {"name": "Cleaning Tools"},
    {"name": "General"}
]

SEED_PRODUCTS = [
    {
        "sku": "CLN-LIQ-DET-2L",
        "name": "Liquid Detergent 2L",
        "category_name": "Laundry & Cleaning",
        "cost_price": Decimal("280.00"),
        "selling_price": Decimal("420.00"),
        "current_stock": 45,
        "description": "High-efficiency liquid laundry detergent with fresh scent.",
        "image_url": "https://picsum.photos/seed/det2l/400/300.webp"
    },
    {
        "sku": "CLN-SOL-DET-BAR",
        "name": "Solid Detergent",
        "category_name": "Laundry & Cleaning",
        "cost_price": Decimal("80.00"),
        "selling_price": Decimal("140.00"),
        "current_stock": 60,
        "description": "Multi-purpose solid cleaning detergent bar (Pack of 4).",
        "image_url": "https://picsum.photos/seed/detbar/400/300.webp"
    },
    {
        "sku": "CLN-BLEACH-1L",
        "name": "Bleach 1L",
        "category_name": "Laundry & Cleaning",
        "cost_price": Decimal("90.00"),
        "selling_price": Decimal("160.00"),
        "current_stock": 30,
        "description": "Multi-surface disinfectant & fabric whitening bleach.",
        "image_url": "https://picsum.photos/seed/bleach/400/300.webp"
    },
    {
        "sku": "PC-ABAYA-SHMP",
        "name": "Abaya Shampoo 1.5L",
        "category_name": "Personal Care",
        "cost_price": Decimal("220.00"),
        "selling_price": Decimal("380.00"),
        "current_stock": 25,
        "description": "Specialized gentle fabric wash for dark garments & abayas.",
        "image_url": "https://picsum.photos/seed/abaya/400/300.webp"
    },
    {
        "sku": "PC-HAIR-SHMP-500",
        "name": "Hair Shampoo 500ml",
        "category_name": "Hair Care",
        "cost_price": Decimal("150.00"),
        "selling_price": Decimal("260.00"),
        "current_stock": 35,
        "description": "Nourishing herbal hair shampoo for smooth shine.",
        "image_url": "https://picsum.photos/seed/shmp/400/300.webp"
    },
    {
        "sku": "PC-HAIR-COND-500",
        "name": "Hair Conditioner 500ml",
        "category_name": "Hair Care",
        "cost_price": Decimal("160.00"),
        "selling_price": Decimal("280.00"),
        "current_stock": 28,
        "description": "Deep moisture hair conditioning cream.",
        "image_url": "https://picsum.photos/seed/cond/400/300.webp"
    },
    {
        "sku": "CLN-FAB-SOFT-2L",
        "name": "Fabric Softener 2L",
        "category_name": "Laundry & Cleaning",
        "cost_price": Decimal("210.00"),
        "selling_price": Decimal("350.00"),
        "current_stock": 20,
        "description": "Long-lasting floral fresh fabric softener.",
        "image_url": "https://picsum.photos/seed/soft/400/300.webp"
    },
    {
        "sku": "TOOLS-BROOM-HD",
        "name": "Cleaning Broom",
        "category_name": "Cleaning Tools",
        "cost_price": Decimal("120.00"),
        "selling_price": Decimal("220.00"),
        "current_stock": 15,
        "description": "Heavy-duty indoor & outdoor floor broom.",
        "image_url": "https://picsum.photos/seed/broom/400/300.webp"
    },
    {
        "sku": "TOOLS-BUCKET-15L",
        "name": "Cleaning Bucket 15L",
        "category_name": "Cleaning Tools",
        "cost_price": Decimal("180.00"),
        "selling_price": Decimal("320.00"),
        "current_stock": 18,
        "description": "Durable plastic cleaning bucket with sturdy handle.",
        "image_url": "https://picsum.photos/seed/bucket/400/300.webp"
    },
    {
        "sku": "TOOLS-GARBAGE-BSK",
        "name": "Garbage Basket",
        "category_name": "Cleaning Tools",
        "cost_price": Decimal("110.00"),
        "selling_price": Decimal("200.00"),
        "current_stock": 4,
        "description": "Ventilated mesh plastic waste basket.",
        "image_url": "https://picsum.photos/seed/bsk/400/300.webp"
    },
    {
        "sku": "PC-HAIR-FOOD-250",
        "name": "Hair Food 250g",
        "category_name": "Hair Care",
        "cost_price": Decimal("130.00"),
        "selling_price": Decimal("240.00"),
        "current_stock": 40,
        "description": "Rich essential oil hair food for scalp nourishment.",
        "image_url": "https://picsum.photos/seed/food/400/300.webp"
    }
]

def get_iso_date(days_ago: int, hours: int = 10, minutes: int = 30) -> datetime:
    d = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return d.replace(hour=hours, minute=minutes, second=0, microsecond=0)

SEED_TRANSACTIONS = [
    {
        "id": "TXN-4011",
        "timestamp": get_iso_date(0, 9, 15),
        "payment_method": "Telebirr",
        "total_revenue": Decimal("1190.00"),
        "total_profit": Decimal("420.00"),
        "items": [
            {"sku": "CLN-LIQ-DET-2L", "quantity": 2, "cost_price": Decimal("280.00"), "selling_price": Decimal("420.00")},
            {"sku": "CLN-FAB-SOFT-2L", "quantity": 1, "cost_price": Decimal("210.00"), "selling_price": Decimal("350.00")}
        ]
    },
    {
        "id": "TXN-4012",
        "timestamp": get_iso_date(0, 11, 45),
        "payment_method": "Cash",
        "total_revenue": Decimal("780.00"),
        "total_profit": Decimal("340.00"),
        "items": [
            {"sku": "PC-HAIR-SHMP-500", "quantity": 1, "cost_price": Decimal("150.00"), "selling_price": Decimal("260.00")},
            {"sku": "PC-HAIR-COND-500", "quantity": 1, "cost_price": Decimal("160.00"), "selling_price": Decimal("280.00")},
            {"sku": "PC-HAIR-FOOD-250", "quantity": 1, "cost_price": Decimal("130.00"), "selling_price": Decimal("240.00")}
        ]
    },
    {
        "id": "TXN-4008",
        "timestamp": get_iso_date(4, 14, 20),
        "payment_method": "Bank",
        "total_revenue": Decimal("1080.00"),
        "total_profit": Decimal("460.00"),
        "items": [
            {"sku": "PC-ABAYA-SHMP", "quantity": 2, "cost_price": Decimal("220.00"), "selling_price": Decimal("380.00")},
            {"sku": "CLN-BLEACH-1L", "quantity": 2, "cost_price": Decimal("90.00"), "selling_price": Decimal("160.00")}
        ]
    },
    {
        "id": "TXN-4007",
        "timestamp": get_iso_date(7, 16, 10),
        "payment_method": "Telebirr",
        "total_revenue": Decimal("760.00"),
        "total_profit": Decimal("340.00"),
        "items": [
            {"sku": "TOOLS-BROOM-HD", "quantity": 2, "cost_price": Decimal("120.00"), "selling_price": Decimal("220.00")},
            {"sku": "TOOLS-BUCKET-15L", "quantity": 1, "cost_price": Decimal("180.00"), "selling_price": Decimal("320.00")}
        ]
    },
    {
        "id": "TXN-3995",
        "timestamp": get_iso_date(35, 10, 0),
        "payment_method": "Cash",
        "total_revenue": Decimal("1100.00"),
        "total_profit": Decimal("480.00"),
        "items": [
            {"sku": "CLN-SOL-DET-BAR", "quantity": 5, "cost_price": Decimal("80.00"), "selling_price": Decimal("140.00")},
            {"sku": "TOOLS-GARBAGE-BSK", "quantity": 2, "cost_price": Decimal("110.00"), "selling_price": Decimal("200.00")}
        ]
    }
]
