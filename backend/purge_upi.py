import sqlite3
import os

# Define the database path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "sufi_local.db")

def purge_upi_settings():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Keys to remove
        keys_to_purge = [
            'upi_id', 
            'upi_owner_name', 
            'upi_owner_phone', 
            'upi_owner_note'
        ]

        print(f"🧹 Purging legacy payment keys from local database...")
        
        for key in keys_to_purge:
            cursor.execute("DELETE FROM app_setting WHERE key = ?", (key,))
            if cursor.rowcount > 0:
                print(f"   ✅ Removed: {key}")
            else:
                print(f"   ℹ️ Not found: {key}")

        conn.commit()
        conn.close()
        print("✨ Database purge complete.")

    except Exception as e:
        print(f"❌ Error during purge: {e}")

if __name__ == "__main__":
    purge_upi_settings()
