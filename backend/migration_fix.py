import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

def migrate():
    with app.app_context():
        print("🔍 Checking schema for missing columns...")
        
        # List of columns to ensure exist in the 'product' table
        columns_to_add = [
            ("embedding_json", "TEXT"),
            ("seo_metadata", "JSONB"),
            ("views_count", "INTEGER DEFAULT 0"),
            ("sales_count", "INTEGER DEFAULT 0"),
            ("margin_percentage", "FLOAT DEFAULT 0.20"),
            ("manual_boost_score", "FLOAT DEFAULT 0.0")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # Attempt to add column, ignore if it already exists
                db.session.execute(text(f"ALTER TABLE product ADD COLUMN {col_name} {col_type};"))
                db.session.commit()
                print(f"✅ Added column: {col_name}")
            except Exception as e:
                db.session.rollback()
                if "already exists" in str(e).lower():
                    print(f"ℹ️ Column already exists: {col_name}")
                else:
                    print(f"❌ Error adding {col_name}: {e}")
        
        print("✨ Schema sync complete.")

if __name__ == "__main__":
    migrate()
