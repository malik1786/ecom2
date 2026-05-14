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
        print("🔍 Renaming column UserEvent.query to search_query...")
        try:
            # Rename column in user_event table
            db.session.execute(text("ALTER TABLE user_event RENAME COLUMN query TO search_query;"))
            db.session.commit()
            print("✅ Column renamed successfully.")
        except Exception as e:
            db.session.rollback()
            if "does not exist" in str(e).lower():
                print("ℹ️ Column 'query' not found. It might have already been renamed.")
            else:
                print(f"❌ Error: {e}")
        
        print("✨ Migration complete.")

if __name__ == "__main__":
    migrate()
