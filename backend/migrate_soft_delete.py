import sqlite3
import os

# Paths to potential SQLite databases
db_paths = [
    "backend/sufi_local.db",
    "backend/sufi.db",
    "sufi_local.db",
    "sufi.db"
]

def migrate_db(path):
    if not os.path.exists(path):
        return
    
    print(f"Migrating database: {path}")
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    # Add is_deleted to customer
    try:
        cursor.execute("ALTER TABLE customer ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL")
        print("  - Added is_deleted to customer table")
    except sqlite3.OperationalError:
        print("  - is_deleted already exists in customer table")

    # Add is_deleted to order
    try:
        cursor.execute("ALTER TABLE \"order\" ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL")
        print("  - Added is_deleted to order table")
    except sqlite3.OperationalError:
        # Try without quotes if it fails
        try:
            cursor.execute("ALTER TABLE order ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL")
            print("  - Added is_deleted to order table (no quotes)")
        except sqlite3.OperationalError:
            print("  - is_deleted already exists in order table")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    for p in db_paths:
        migrate_db(p)
    print("Migration complete!")
