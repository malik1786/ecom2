from __future__ import annotations
from datetime import datetime, timedelta, timezone
from functools import wraps
import base64
import hmac
import json
import os
import random
import re
import secrets
import uuid
import time
import threading
import hashlib
import numpy as np
from flask import Flask, g, jsonify, request, send_from_directory, url_for
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine, distinct, func, inspect, or_, text
from sqlalchemy.sql.functions import count as sa_count
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from werkzeug.exceptions import HTTPException
import io
import urllib.request
import urllib.error

try:
    from PIL import Image
except ImportError:
    pass

from dotenv import load_dotenv
load_dotenv()
try:
    from seo_engine import SEORoutingEngine, ProductSEOOptimizer
except ModuleNotFoundError:
    # Support package import path when app is loaded as `backend.app`
    from .seo_engine import SEORoutingEngine, ProductSEOOptimizer

app = Flask(__name__)
_frontend_origin = (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")
_cors_origins = sorted({
    _frontend_origin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
})
CORS(app, resources={r"/api/*": {"origins": _cors_origins}}, supports_credentials=True)

# SECURITY: Rate Limiting
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri="memory://",
)

INTERNAL_SECRET = os.environ.get('INTERNAL_SERVICE_SECRET', 'SUPER_SECRET_INTERNAL_KEY_123')

@app.before_request
def verify_internal_access():
    """
    Zero-Trust: Reject any request not coming from the production gateway.
    Exempts localhost during development (Debug Mode).
    """
    # 1. Exempt health and static routes
    if request.path in ['/health', '/api/health'] or request.path.startswith('/static'):
        return
        
    # 2. Exempt Localhost in Dev Mode
    is_local = request.remote_addr in ['127.0.0.1', 'localhost']
    if app.debug and is_local:
        return

    # 3. Verify Internal Secret
    secret = request.headers.get('x-internal-secret')
    if not secret or secret != INTERNAL_SECRET:
        app.logger.error(f"[SECURITY-ALERT] Unauthorized direct access attempt to {request.path} from {request.remote_addr}")
        return jsonify({"error": "UNAUTHORIZED_INTERNAL_ACCESS"}), 401


@app.errorhandler(Exception)
def handle_api_errors(error: Exception):
    """
    Return structured JSON errors instead of HTML tracebacks.
    """
    if isinstance(error, HTTPException):
        return jsonify({"error": error.name, "message": error.description}), error.code

    is_debug = bool(app.debug) or (os.getenv("FLASK_DEBUG") == "1")
    if is_debug:
        return jsonify({"error": "INTERNAL_SERVER_ERROR", "message": str(error)}), 500
    return jsonify({"error": "INTERNAL_SERVER_ERROR"}), 500

# --- MODULE: SYSTEM USAGE MONITORING ---
def get_dir_size(start_path='.'):
    total_size = 0
    try:
        if not os.path.exists(start_path): return 0
        for dirpath, dirnames, filenames in os.walk(start_path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
    except Exception:
        pass
    return total_size

@app.route('/api/admin/system-usage')
def get_system_usage():
    try:
        # 1. Storage Metrics
        uploads_dir = os.path.join(BASE_DIR, 'static/uploads')
        logs_dir = os.path.join(BASE_DIR, 'logs')
        cache_dir = os.path.join(BASE_DIR, 'cache')
        
        uploads_size = get_dir_size(uploads_dir)
        logs_size = get_dir_size(logs_dir)
        cache_size = get_dir_size(cache_dir)
        
        db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
        db_size = 0
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            if os.path.exists(db_path):
                db_size = os.path.getsize(db_path)
        
        # 2. System Metrics
        import psutil
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        
        is_railway = os.getenv('RAILWAY_ENVIRONMENT') is not None
        
        return jsonify({
            "success": True,
            "storage": {
                "uploads_mb": round(uploads_size / (1024 * 1024), 2),
                "logs_mb": round(logs_size / (1024 * 1024), 2),
                "database_mb": round(db_size / (1024 * 1024), 2),
                "cache_mb": round(cache_size / (1024 * 1024), 2),
                "total_used_mb": round((uploads_size + logs_size + db_size + cache_size) / (1024 * 1024), 2),
                "limit_mb": 1024 * 1024 # 1 TB Limit for $5 Railway Tier
            },
            "system": {
                "memory_mb": round(mem_info.rss / (1024 * 1024), 2),
                "cpu_percent": psutil.cpu_percent(),
                "uptime_sec": round(time.time() - process.create_time(), 0),
                "is_production": is_railway
            },
            "counts": {
                "products": Product.query.count() if 'Product' in globals() else 0,
                "orders": Order.query.count() if 'Order' in globals() else 0,
                "customers": Customer.query.count() if 'Customer' in globals() else 0
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# MODULE: Resilient Database Configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PRIMARY_DB_URL = os.getenv("DATABASE_URL")
FALLBACK_DB_URL = f"sqlite:///{os.path.join(BASE_DIR, 'sufi_local.db')}"

app.config["SQLALCHEMY_DATABASE_URI"] = (PRIMARY_DB_URL or "").strip() or FALLBACK_DB_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "sufi-fashion-admin-secret")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

db = SQLAlchemy()

def init_db(app):
    selected_uri = (PRIMARY_DB_URL or "").strip() or FALLBACK_DB_URL
    db_fallback_active = False
    db_degraded = False
    db_degraded_reason = None
    if selected_uri != FALLBACK_DB_URL:
        try:
            test_engine = create_engine(selected_uri, pool_pre_ping=True)
            with test_engine.connect():
                pass
            print("Primary Database Connected.")
        except Exception as exc:
            print(f"Primary Database Connection Failed: {exc}")
            allow_fallback = os.getenv("SUFI_ALLOW_DB_FALLBACK", "").strip().lower() in {"1", "true", "yes"}
            env_name = (os.getenv("FLASK_ENV") or os.getenv("ENV") or os.getenv("NODE_ENV") or "").strip().lower()
            is_production = env_name == "production"

            if is_production and not allow_fallback:
                print("⚠️  DB fallback disabled in production. Starting in degraded mode (orders/payments blocked).")
                db_degraded = True
                db_degraded_reason = "PRIMARY_DB_CONNECTION_FAILED"
                # Keep SQLite configured so the app can boot, but block writes to avoid splitting prod data.
                db_fallback_active = True
                selected_uri = FALLBACK_DB_URL
            else:
                print(f"Falling back to Local SQLite: {FALLBACK_DB_URL}")
                db_fallback_active = True
                selected_uri = FALLBACK_DB_URL

    app.config["SQLALCHEMY_DATABASE_URI"] = selected_uri
    app.config["DB_FALLBACK_ACTIVE"] = db_fallback_active
    app.config["DB_DEGRADED"] = db_degraded
    app.config["DB_DEGRADED_REASON"] = db_degraded_reason
    db.init_app(app)

init_db(app)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Token store for lightweight admin auth. In production, use JWT or sessions.
ACTIVE_ADMIN_TOKENS: dict[str, dict] = {}
ACTIVE_CUSTOMER_TOKENS: dict[str, dict] = {}

# MODULE 9: Performance + Intelligent Caching
# Simple in-memory cache for SEO results with TTL
SEO_CACHE = {}
SEARCH_INDEX_VERSION = 1

def bump_search_index_version() -> int:
    global SEARCH_INDEX_VERSION
    SEARCH_INDEX_VERSION += 1
    return SEARCH_INDEX_VERSION

def get_from_cache(query_hash):
    if query_hash in SEO_CACHE:
        entry = SEO_CACHE[query_hash]
        if entry['expires_at'] > utc_now():
            return entry['data']
        else:
            SEO_CACHE.pop(query_hash)
    return None

def set_in_cache(query_hash, data, ttl_seconds=300):
    SEO_CACHE[query_hash] = {
        "data": data,
        "expires_at": utc_now() + timedelta(seconds=ttl_seconds)
    }



# --- Helpers ---

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def dt_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_price_to_cents(value, default: int = 0) -> int:
    if value is None:
        return default

    if isinstance(value, int):
        return max(value, 0)

    if isinstance(value, float):
        return max(int(round(value * 100)), 0)

    if isinstance(value, str):
        cleaned = re.sub(r"[^0-9.]", "", value)
        if cleaned == "":
            return default
        try:
            return max(int(round(float(cleaned) * 100)), 0)
        except ValueError:
            return default

    return default


def format_cents(cents: int, currency: str = "INR") -> str:
    symbol = "Rs. "
    return f"{symbol}{cents / 100:.2f}"


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def normalize_notes(raw_value) -> str:
    if raw_value is None:
        return ""
    if isinstance(raw_value, list):
        return ", ".join([str(v).strip() for v in raw_value if str(v).strip()])
    return str(raw_value).strip()


def split_notes(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [part.strip() for part in raw_value.split(",") if part.strip()]


def normalize_image_list(raw_value) -> list[str]:
    if raw_value is None:
        return []

    if isinstance(raw_value, str):
        stripped = raw_value.strip()
        if stripped == "":
            return []
        if stripped.startswith("["):
            try:
                raw_value = json.loads(stripped)
            except json.JSONDecodeError:
                raw_value = re.split(r"[\r\n,]+", stripped)
        else:
            raw_value = re.split(r"[\r\n,]+", stripped)

    if not isinstance(raw_value, list):
        raw_value = [raw_value]

    images: list[str] = []
    for item in raw_value:
        value = str(item or "").strip()
        if value and value not in images:
            images.append(value)
    return images


def product_images(product) -> list[str]:
    images = normalize_image_list(getattr(product, "gallery_images", None))
    primary = (getattr(product, "primary_image", None) or product.image_url or "").strip()
    if primary and primary not in images:
        images.insert(0, primary)
    return images


def order_number() -> str:
    ts = datetime.now().strftime("%Y%m%d")
    random_part = secrets.token_hex(2).upper()
    return f"SF-{ts}-{random_part}"


def average_rating_for_product(product_id: int) -> float:
    avg_value = (
        db.session.query(func.avg(ProductReview.rating))
        .filter(
            ProductReview.product_id == product_id,
            ProductReview.is_approved.is_(True),
        )
        .scalar()
    )
    return round(float(avg_value), 1) if avg_value is not None else 0.0


def create_admin_token(admin_user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    ACTIVE_ADMIN_TOKENS[token] = {
        "admin_user_id": admin_user_id,
        "expires_at": utc_now() + timedelta(hours=12),
    }
    return token


def token_from_request() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return ""
    return auth_header.split(" ", 1)[1].strip()


def _b64url_decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("utf-8"))


def verify_jwt_hs256(token: str, secret: str) -> dict | None:
    """
    Minimal HS256 JWT verification to avoid extra dependencies.
    Returns payload dict on success, otherwise None.
    """
    if not token or token.count(".") != 2:
        return None

    header_b64, payload_b64, sig_b64 = token.split(".", 2)
    try:
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        return None

    if header.get("alg") != "HS256":
        return None

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new((secret or "").encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        actual_sig = _b64url_decode(sig_b64)
    except Exception:
        return None

    if not hmac.compare_digest(expected_sig, actual_sig):
        return None

    exp = payload.get("exp")
    if isinstance(exp, (int, float)) and utc_now().timestamp() > float(exp):
        return None

    return payload


def admin_from_token(token: str):
    if not token:
        return None

    payload = ACTIVE_ADMIN_TOKENS.get(token)
    if not payload:
        return None

    if payload["expires_at"] < utc_now():
        ACTIVE_ADMIN_TOKENS.pop(token, None)
        return None

    return db.session.get(AdminUser, payload["admin_user_id"])


def require_admin_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = token_from_request()
        admin_user = admin_from_token(token)
        if not admin_user:
            return jsonify({"error": "Unauthorized"}), 401
        g.admin_user = admin_user
        return fn(*args, **kwargs)

    return wrapper


def create_customer_token(customer_id: int) -> str:
    token = secrets.token_urlsafe(32)
    ACTIVE_CUSTOMER_TOKENS[token] = {
        "customer_id": customer_id,
        "expires_at": utc_now() + timedelta(days=7),
    }
    return token


def customer_from_token(token: str):
    if not token:
        return None
    payload = ACTIVE_CUSTOMER_TOKENS.get(token)
    if not payload:
        return None
    if payload["expires_at"] < utc_now():
        ACTIVE_CUSTOMER_TOKENS.pop(token, None)
        return None
    return db.session.get(Customer, payload["customer_id"])


def require_customer_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = token_from_request()
        customer = customer_from_token(token)
        if not customer:
            jwt_payload = verify_jwt_hs256(token, os.getenv("JWT_SECRET", ""))
            email = (jwt_payload or {}).get("email") or ""
            email = str(email).strip().lower()
            if email:
                customer = Customer.query.filter(func.lower(Customer.email) == email).first()
                if customer is None:
                    customer = Customer(email=email, full_name=email.split("@")[0] or "Customer")
                    db.session.add(customer)
                    db.session.commit()
        if not customer:
            return jsonify({"error": "Unauthorized"}), 401
        g.customer = customer
        return fn(*args, **kwargs)
    return wrapper


# --- Models ---
class AdminUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False, default="Administrator")
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "created_at": dt_iso(self.created_at),
        }


class AppSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": dt_iso(self.updated_at)
        }


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    tagline = db.Column(db.String(220), nullable=True)
    scent_no = db.Column(db.String(50), nullable=True)
    price_cents = db.Column(db.Integer, nullable=False, default=0)
    currency = db.Column(db.String(6), nullable=False, default="INR")
    image_url = db.Column(db.String(255), nullable=True)
    primary_image = db.Column(db.Text, nullable=True)
    gallery_images = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(60), nullable=True)
    inventory_count = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    top_notes = db.Column(db.String(255), nullable=True)
    heart_notes = db.Column(db.String(255), nullable=True)
    base_notes = db.Column(db.String(255), nullable=True)
    is_featured = db.Column(db.Boolean, default=False)
    is_trending = db.Column(db.Boolean, default=False)
    is_new_arrival = db.Column(db.Boolean, default=False)
    is_limited_edition = db.Column(db.Boolean, default=False)
    is_best_seller = db.Column(db.Boolean, default=False)
    is_on_sale = db.Column(db.Boolean, default=False)
    sale_price_cents = db.Column(db.Integer, nullable=True)
    compare_at_price_cents = db.Column(db.Integer, nullable=True)
    variants_json = db.Column(db.JSON, nullable=True)
    narrative_image = db.Column(db.String(255), nullable=True)
    narrative_description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    
    # --- PRODUCTION SEO + AI FIELDS ---
    embedding_json = db.Column(db.Text, nullable=True) # JSON array of 384 floats
    seo_metadata = db.Column(db.JSON, nullable=True)
    views_count = db.Column(db.Integer, default=0)
    sales_count = db.Column(db.Integer, default=0)
    
    # --- REVENUE OPTIMIZATION FIELDS ---
    margin_percentage = db.Column(db.Float, default=0.20) # e.g. 0.20 = 20%
    manual_boost_score = db.Column(db.Float, default=0.0) # 0 to 1 range

    def to_dict(self):
        images = product_images(self)
        review_count = (
            db.session.query(sa_count(ProductReview.id))
            .filter(
                ProductReview.product_id == self.id,
                ProductReview.is_approved.is_(True),
            )
            .scalar()
        )
        display_currency = "INR"
        return {
            "id": self.id,
            "_id": str(self.id),
            "name": self.name,
            "slug": self.slug,
            "tagline": self.tagline,
            "scentNo": self.scent_no,
            "price": format_cents(self.price_cents, display_currency),
            "price_cents": self.price_cents,
            "currency": display_currency,
            "image": images[0] if images else None,
            "images": images,
            "description": self.description,
            "category": self.category,
            "inventory_count": self.inventory_count,
            "is_active": self.is_active,
            "is_featured": self.is_featured,
            "is_trending": self.is_trending,
            "is_new_arrival": self.is_new_arrival,
            "is_limited_edition": self.is_limited_edition,
            "is_best_seller": self.is_best_seller,
            "is_on_sale": self.is_on_sale,
            "sale_price_cents": self.sale_price_cents,
            "sale_price": format_cents(self.sale_price_cents, display_currency) if self.sale_price_cents else None,
            "compare_at_price_cents": self.compare_at_price_cents,
            "compare_at_price": format_cents(self.compare_at_price_cents, display_currency) if self.compare_at_price_cents else None,
            "variants": self.variants_json,
            "top_notes": split_notes(self.top_notes),
            "heart_notes": split_notes(self.heart_notes),
            "base_notes": split_notes(self.base_notes),
            "narrative_image": self.narrative_image,
            "narrative_description": self.narrative_description,
            "review_count": int(review_count or 0),
            "average_rating": average_rating_for_product(self.id),
            "created_at": dt_iso(self.created_at),
            "updated_at": dt_iso(self.updated_at),
            "views": self.views_count,
            "sales": self.sales_count,
            "embedding_json": self.embedding_json,
            "embedding_ready": self.embedding_json is not None
        }


class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    city = db.Column(db.String(80), nullable=True)
    state = db.Column(db.String(80), nullable=True)
    country = db.Column(db.String(80), nullable=True, default="India")
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    def to_dict(self, include_orders=False):
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "created_at": dt_iso(self.created_at),
        }
        if include_orders:
            data["orders"] = [o.to_dict(include_customer=False) for o in self.orders] if self.orders else []
        return data


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(30), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("customer.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="new")
    payment_status = db.Column(db.String(30), nullable=False, default="pending")
    currency = db.Column(db.String(6), nullable=False, default="INR")
    subtotal_cents = db.Column(db.Integer, nullable=False, default=0)
    shipping_cents = db.Column(db.Integer, nullable=False, default=0)
    tax_cents = db.Column(db.Integer, nullable=False, default=0)
    total_cents = db.Column(db.Integer, nullable=False, default=0)
    payment_method = db.Column(db.String(40), nullable=True, default="cod")
    payment_details = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    shipping_address = db.Column(db.Text, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    customer = db.relationship("Customer", backref=db.backref("orders", lazy=True))

    def to_dict(self, include_customer=True):
        parsed_payment_details = self.payment_details
        if isinstance(parsed_payment_details, str) and parsed_payment_details.strip():
            try:
                parsed_payment_details = json.loads(parsed_payment_details)
            except Exception:
                parsed_payment_details = self.payment_details

        data = {
            "id": self.id,
            "order_number": self.order_number,
            "status": self.status,
            "payment_status": self.payment_status,
            "currency": self.currency,
            "subtotal_cents": self.subtotal_cents,
            "shipping_cents": self.shipping_cents,
            "tax_cents": self.tax_cents,
            "total_cents": self.total_cents,
            "subtotal": format_cents(self.subtotal_cents, self.currency),
            "shipping": format_cents(self.shipping_cents, self.currency),
            "tax": format_cents(self.tax_cents, self.currency),
            "total": format_cents(self.total_cents, self.currency),
            "payment_method": self.payment_method,
            "payment_details": parsed_payment_details,
            "notes": self.notes,
            "shipping_address": json.loads(self.shipping_address)
            if self.shipping_address
            else None,
            "items": [item.to_dict() for item in self.items],
            "created_at": dt_iso(self.created_at),
            "updated_at": dt_iso(self.updated_at),
        }
        if include_customer and self.customer:
            data["customer"] = self.customer.to_dict(include_orders=False)
        return data


class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    product_name = db.Column(db.String(120), nullable=False)
    unit_price_cents = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    line_total_cents = db.Column(db.Integer, nullable=False)

    order = db.relationship("Order", backref=db.backref("items", lazy=True, cascade="all, delete-orphan"))
    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "unit_price_cents": self.unit_price_cents,
            "quantity": self.quantity,
            "line_total_cents": self.line_total_cents,
            "unit_price": format_cents(self.unit_price_cents),
            "line_total": format_cents(self.line_total_cents),
        }


class ProductReview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    reviewer_name = db.Column(db.String(120), nullable=False)
    reviewer_email = db.Column(db.String(120), nullable=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text, nullable=True)
    is_approved = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    product = db.relationship("Product", backref=db.backref("reviews", lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "reviewer_name": self.reviewer_name,
            "reviewer_email": self.reviewer_email,
            "rating": self.rating,
            "comment": self.comment,
            "image_url": self.image_url,
            "is_approved": self.is_approved,
            "created_at": dt_iso(self.created_at),
        }
class UserEvent(db.Model):
    """
    PHASE 1: EVENT TRACKING SYSTEM
    Tracks user behavior for the self-learning ranking engine.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(120), nullable=True)
    event_type = db.Column(db.String(30), nullable=False) # view, click, cart, buy
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=True)
    search_query = db.Column(db.String(255), nullable=True)
    ab_group = db.Column(db.String(10), nullable=True) # Task: Split Users
    timestamp = db.Column(db.DateTime(timezone=True), default=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "product_id": self.product_id,
            "search_query": self.search_query,
            "timestamp": dt_iso(self.timestamp)
        }


# --- Seed Data ---
def build_unique_slug(name: str) -> str:
    base = slugify(name) or "product"
    current = base
    i = 2
    while Product.query.filter_by(slug=current).first() is not None:
        current = f"{base}-{i}"
        i += 1
    return current


def apply_product_payload(product: Product, payload: dict):
    name = (payload.get("name") or payload.get("title") or product.name or "").strip()
    if not name:
        raise ValueError("Product name is required")

    price_cents = parse_price_to_cents(payload.get("price_cents"))
    if price_cents <= 0:
        price_cents = parse_price_to_cents(payload.get("price"), product.price_cents)
    if price_cents <= 0:
        raise ValueError("Price must be greater than 0")

    product.name = name
    if not product.slug or payload.get("slug"):
        requested_slug = slugify(payload.get("slug") or name)
        if requested_slug and requested_slug != product.slug:
            existing = Product.query.filter(Product.slug == requested_slug, Product.id != product.id).first()
            product.slug = requested_slug if existing is None else build_unique_slug(name)
    product.tagline = (payload.get("tagline") or "").strip() or None
    product.scent_no = (payload.get("scentNo") or payload.get("scent_no") or "").strip() or None
    product.price_cents = price_cents
    # Business rule: storefront pricing is INR-only.
    product.currency = "INR"

    raw_images = payload.get("images")
    if raw_images is None:
        raw_images = payload.get("gallery_images")
    images = normalize_image_list(raw_images)

    explicit_primary = (payload.get("primary_image") or payload.get("image") or payload.get("image_url") or "").strip()
    if explicit_primary:
        images = [explicit_primary, *[img for img in images if img != explicit_primary]]

    primary_image = images[0] if images else None
    product.primary_image = primary_image
    product.gallery_images = json.dumps(images) if images else None
    product.image_url = primary_image if primary_image and len(primary_image) <= 255 else None

    product.description = (payload.get("description") or "").strip() or None
    product.category = (payload.get("category") or "").strip() or None

    product.inventory_count = int(payload.get("inventory_count") or payload.get("count") or 0)
    product.is_active = bool(payload.get("is_active", True))
    product.is_featured = bool(payload.get("is_featured", False))
    product.is_trending = bool(payload.get("is_trending", False))
    product.is_new_arrival = bool(payload.get("is_new_arrival", False))
    product.is_limited_edition = bool(payload.get("is_limited_edition", False))
    product.is_best_seller = bool(payload.get("is_best_seller", False))
    product.is_on_sale = bool(payload.get("is_on_sale", False))
    product.sale_price_cents = parse_price_to_cents(payload.get("sale_price")) if payload.get("sale_price") else None
    product.compare_at_price_cents = parse_price_to_cents(payload.get("compare_at_price")) if payload.get("compare_at_price") else None
    product.variants_json = payload.get("variants") if payload.get("variants") else None
    product.top_notes = normalize_notes(payload.get("top_notes", ""))
    product.heart_notes = normalize_notes(payload.get("heart_notes", ""))
    product.base_notes = normalize_notes(payload.get("base_notes", ""))

    product.narrative_image = (payload.get("narrative_image") or "").strip() or None
    product.narrative_description = (payload.get("narrative_description") or "").strip() or None


def find_or_create_customer(customer_data: dict) -> Customer:
    email = (customer_data.get("email") or "").strip().lower()
    full_name = (customer_data.get("full_name") or customer_data.get("name") or "").strip()

    if not full_name:
        raise ValueError("Customer full_name is required")
    if not email:
        raise ValueError("Customer email is required")

    customer = Customer.query.filter(func.lower(Customer.email) == email).first()

    if customer is None:
        customer = Customer(email=email, full_name=full_name)
        db.session.add(customer)

    customer.full_name = full_name
    customer.phone = (customer_data.get("phone") or "").strip() or None
    customer.city = (customer_data.get("city") or "").strip() or None
    customer.state = (customer_data.get("state") or "").strip() or None
    customer.country = (customer_data.get("country") or "India").strip() or "India"

    return customer


def seed_initial_data():
    admin = AdminUser.query.filter_by(username="admin").first()
    if admin is None:
        admin = AdminUser(
            username="admin",
            full_name="Sufi Fashion Admin",
            password_hash=generate_password_hash("sufi123"),
        )
        db.session.add(admin)

    if Product.query.count() < 10:
        base_products = [
            # (name, slug, scent_no, tagline, category, price_cents, img, top, heart, base)
            ("Oud Imperial",       "oud-imperial",       "SCENT NO. 01", "The pinnacle of depth",      "PRIVATE BLEND", 119800, "/src/assets/hero-bottle.png", "Saffron, Bergamot",    "Rose, Oud",          "Silk Woods, Ambergris"),
            ("Celestial Musk",     "celestial-musk",     "SCENT NO. 02", "Ethereal and light",         "FLORAL",        119800, "/src/assets/hero-bottle.png", "Peach, Bergamot",      "Jasmine, Musk",      "Sandalwood, Vanilla"),
            ("Amber Sultan",       "amber-sultan",       "SCENT NO. 03", "Warmth of the sun",          "ORIENTAL",      119800, "/src/assets/hero-bottle.png", "Cardamom, Saffron",    "Amber, Rose",        "Oud, Musk"),
            ("Desert Rose",        "desert-rose",        "SCENT NO. 04", "Strength in fragility",      "FLORAL",        119800, "/src/assets/hero-bottle.png", "Lychee, Bergamot",     "Rose, Iris",         "Patchouli, Musk"),
            ("Midnight Vetiver",   "midnight-vetiver",   "SCENT NO. 05", "Earth after rain",           "WOODY",         119800, "/src/assets/hero-bottle.png", "Grapefruit, Pepper",   "Vetiver, Cedar",     "Leather, Oakmoss"),
            ("Silk Road",          "silk-road",          "SCENT NO. 06", "Journey through spice",      "ORIENTAL",      119800, "/src/assets/hero-bottle.png", "Cinnamon, Pepper",     "Rose, Incense",      "Oud, Sandalwood"),
            ("Azure Coast",        "azure-coast",        "SCENT NO. 07", "Fresh sea air",              "FRESH",         119800, "/src/assets/hero-bottle.png", "Citrus, Sea Breeze",   "Jasmine, Lavender",  "Musk, Cedar"),
            ("Saffron Heart",      "saffron-heart",      "SCENT NO. 08", "Golden essence",             "PRIVATE BLEND", 119800, "/src/assets/hero-bottle.png", "Saffron, Pink Pepper", "Rose, Oud",          "Musk, Amber"),
            ("White Iris",         "white-iris",         "SCENT NO. 09", "Powdery elegance",           "FLORAL",        119800, "/src/assets/hero-bottle.png", "Bergamot, Aldehydes",  "Iris, Violet",       "Musk, Sandalwood"),
            ("Leather Archive",    "leather-archive",    "SCENT NO. 10", "Timeless structure",         "WOODY",         119800, "/src/assets/hero-bottle.png", "Pepper, Sage",         "Leather, Cedar",     "Vetiver, Tobacco"),
            ("Citrus Grove",       "citrus-grove",       "SCENT NO. 11", "Morning light",              "FRESH",         119800, "/src/assets/hero-bottle.png", "Lemon, Neroli",        "Jasmine, Petitgrain","Musk, Cedar"),
            ("Patchouli Noir",     "patchouli-noir",     "SCENT NO. 12", "Dark mystery",               "WOODY",         119800, "/src/assets/hero-bottle.png", "Black Pepper, Plum",   "Patchouli, Rose",    "Oud, Musk"),
            ("Tobacco Leaf",       "tobacco-leaf",       "SCENT NO. 13", "Clubhouse warmth",           "ORIENTAL",      119800, "/src/assets/hero-bottle.png", "Rum, Cardamom",        "Tobacco, Leather",   "Vanilla, Sandalwood"),
            ("Jasmine Atelier",    "jasmine-atelier",    "SCENT NO. 14", "Midnight bloom",             "FLORAL",        119800, "/src/assets/hero-bottle.png", "Bergamot, Green Notes","Jasmine, Tuberose",  "Musk, Cedar"),
            ("Sandalwood Solace",  "sandalwood-solace",  "SCENT NO. 15", "Creamy warmth",              "WOODY",         119800, "/src/assets/hero-bottle.png", "Bergamot, Cardamom",   "Sandalwood, Rose",   "Musk, Vanilla"),
            ("Bergamot Breeze",    "bergamot-breeze",    "SCENT NO. 16", "Italian summer",             "FRESH",         119800, "/src/assets/hero-bottle.png", "Bergamot, Lemon",      "Lavender, Geranium", "Vetiver, Musk"),
            ("Incense Path",       "incense-path",       "SCENT NO. 17", "Sacred ritual",              "ORIENTAL",      119800, "/src/assets/hero-bottle.png", "Frankincense, Pepper", "Incense, Myrrh",     "Oud, Amber"),
            ("Vanilla Silk",       "vanilla-silk",       "SCENT NO. 18", "Gourmand velvet",            "FLORAL",        119800, "/src/assets/hero-bottle.png", "Peach, Bergamot",      "Jasmine, Vanilla",   "Musk, Sandalwood"),
            ("Cedar Ridge",        "cedar-ridge",        "SCENT NO. 19", "Mountain crispness",         "WOODY",         119800, "/src/assets/hero-bottle.png", "Juniper, Pepper",      "Cedar, Vetiver",     "Musk, Amber"),
            ("Golden Amber",       "golden-amber",       "SCENT NO. 20", "Rich resin warmth",          "ORIENTAL",      119800, "/src/assets/hero-bottle.png", "Saffron, Cinnamon",    "Amber, Rose",        "Sandalwood, Musk"),
        ]

        products = []
        for i, (name, slug, sno, tagline, cat, price, img, top, heart, base) in enumerate(base_products):
            products.append(Product(
                name=name,
                slug=slug,
                scent_no=sno,
                tagline=tagline,
                category=cat,
                description=f"An exceptional olfactory masterpiece. {name} — {tagline}. Crafted with the rarest essences sourced from private archives, each drop tells a story of architectural precision and emotional depth.",
                price_cents=price,
                image_url=img,
                inventory_count=20,
                top_notes=top,
                heart_notes=heart,
                base_notes=base,
                is_featured=(i % 4 == 0),
                is_new_arrival=(i % 5 == 0),
                is_trending=(i % 3 == 0),
                is_limited_edition=(i % 7 == 0),
                is_best_seller=(i % 6 == 0),
            ))
        db.session.bulk_save_objects(products)
    else:
        # Force update existing products to show badges for testing
        # Ensure "The Legacy" exists for the dynamic Hero
        legacy = Product.query.filter_by(slug="the-legacy").first()
        if not legacy:
            legacy = Product(
                name="The Legacy",
                slug="the-legacy",
                scent_no="STYLE NO. 01",
                tagline="The definitive archive signature",
                category="PRIVATE BLEND",
                description="Our signature olfactory masterpiece, architectural and timeless.",
                price_cents=35000,
                image_url="/src/assets/hero-bottle.png",
                inventory_count=12,
                top_notes="Saffron",
                heart_notes="Rose & Oud",
                base_notes="Silk Woods",
                is_featured=True,
                is_best_seller=True,
            )
            db.session.add(legacy)
        else:
            legacy.is_featured = True
            legacy.is_best_seller = True
            legacy.top_notes = "Saffron"
            legacy.heart_notes = "Rose & Oud"
            legacy.base_notes = "Silk Woods"
            legacy.image_url = "/src/assets/hero-bottle.png"
        
        p2 = Product.query.filter_by(slug="midnight-atelier").first()
        if p2: 
            p2.is_trending = True
            p2.is_new_arrival = False
            p2.is_best_seller = False
            p2.is_featured = False
            p2.is_limited_edition = False
            
        p3 = Product.query.filter_by(slug="velvet-studio").first()
        if p3: 
            p3.is_limited_edition = True
            p3.is_new_arrival = True
            p3.is_best_seller = False
            p3.is_featured = False
            p3.is_trending = False

    db.session.commit()

    if Customer.query.count() == 0:
        customer = Customer(
            full_name="Ayesha Rahman",
            email="ayesha@example.com",
            phone="+91-9000000000",
            city="Kolkata",
            state="West Bengal",
            country="India",
        )
        db.session.add(customer)
        db.session.commit()

    if Order.query.count() == 0:
        customer = Customer.query.first()
        product = Product.query.first()
        if customer and product:
            quantity = 1
            subtotal = product.price_cents * quantity
            order = Order(
                order_number=order_number(),
                customer_id=customer.id,
                status="processing",
                payment_status="paid",
                currency="USD",
                subtotal_cents=subtotal,
                shipping_cents=0,
                tax_cents=0,
                total_cents=subtotal,
                notes="Seed order",
            )
            db.session.add(order)
            db.session.flush()
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    product_name=product.name,
                    unit_price_cents=product.price_cents,
                    quantity=quantity,
                    line_total_cents=subtotal,
                )
            )
            db.session.commit()

    if ProductReview.query.count() == 0:
        first_product = Product.query.first()
        if first_product:
            db.session.add_all(
                [
                    ProductReview(
                        product_id=first_product.id,
                        reviewer_name="Arianna V.",
                        rating=5,
                        comment="The tailoring is beautiful. Sharp, clean, and easy to style.",
                    ),
                    ProductReview(
                        product_id=first_product.id,
                        reviewer_name="Marcus K.",
                        rating=5,
                        comment="A true standout piece with a premium finish and strong presence.",
                    ),
                ]
            )
            db.session.commit()

    # Seed Hero Videos
    hero_vids_setting = AppSetting.query.filter_by(key="hero_videos").first()
    if not hero_vids_setting:
        default_vids = [
            "https://player.vimeo.com/external/494252666.sd.mp4?s=72fa146af67f13965f3f0194451c071536b13e9d&profile_id=165&oauth2_token_id=57447761",
            "https://player.vimeo.com/external/517090025.sd.mp4?s=d7e7c8581e285a7304f56f1a8d0a51c4e1f744e2&profile_id=165&oauth2_token_id=57447761",
            "https://player.vimeo.com/external/459389137.sd.mp4?s=99440b82f254e6669945037d4f9b2d2427a922d9&profile_id=165&oauth2_token_id=57447761",
            "https://player.vimeo.com/external/371433846.sd.mp4?s=2356d6d4f9036c0a7e5f3299710385781a549d44&profile_id=165&oauth2_token_id=57447761"
        ]
        db.session.add(AppSetting(key="hero_videos", value=json.dumps(default_vids)))
        db.session.commit()


def ensure_product_schema():
    inspector = inspect(db.engine)
    if not inspector.has_table("product"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("product")}
    statements = []

    if "primary_image" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN primary_image TEXT")
    if "gallery_images" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN gallery_images TEXT")
    if "is_featured" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN is_featured BOOLEAN DEFAULT 0")
    if "is_trending" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN is_trending BOOLEAN DEFAULT 0")
    if "is_new_arrival" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN is_new_arrival BOOLEAN DEFAULT 0")
    if "is_limited_edition" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN is_limited_edition BOOLEAN DEFAULT 0")
    if "is_best_seller" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN is_best_seller BOOLEAN DEFAULT 0")
    if "is_on_sale" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN is_on_sale BOOLEAN DEFAULT 0")
    if "sale_price_cents" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN sale_price_cents INTEGER")
    if "compare_at_price_cents" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN compare_at_price_cents INTEGER")
    if "variants_json" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN variants_json JSON")
    if "embedding_json" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN embedding_json TEXT")
    if "seo_metadata" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN seo_metadata JSON")
    if "views_count" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN views_count INTEGER DEFAULT 0")
    if "sales_count" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN sales_count INTEGER DEFAULT 0")
    if "margin_percentage" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN margin_percentage FLOAT DEFAULT 0.20")
    if "manual_boost_score" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN manual_boost_score FLOAT DEFAULT 0.0")
    if "narrative_image" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN narrative_image TEXT")
    if "narrative_description" not in existing_columns:
        statements.append("ALTER TABLE product ADD COLUMN narrative_description TEXT")

    if statements:
        with db.engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))

    # Also ensure order table has payment_method if exists
    if inspector.has_table("order"):
        order_columns = {column["name"] for column in inspector.get_columns("order")}
        if "payment_method" not in order_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE `order` ADD COLUMN payment_method VARCHAR(40) DEFAULT 'cod'"))
        if "payment_details" not in order_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE `order` ADD COLUMN payment_details TEXT"))

    if inspector.has_table("customer"):
        customer_columns = {column["name"] for column in inspector.get_columns("customer")}
        if "password_hash" not in customer_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE customer ADD COLUMN password_hash VARCHAR(255)"))
        if "phone" not in customer_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE customer ADD COLUMN phone VARCHAR(30)"))
        if "city" not in customer_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE customer ADD COLUMN city VARCHAR(80)"))
        if "state" not in customer_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE customer ADD COLUMN state VARCHAR(80)"))
        if "country" not in customer_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE customer ADD COLUMN country VARCHAR(80) DEFAULT 'India'"))


# --- AI Engines Initialization ---
_learner = None
_vector_engine = None

def get_ai_engines():
    global _learner, _vector_engine
    from seo_engine import LearningEngine, VectorSearchEngine
    if _learner is None:
        _learner = LearningEngine()
    if _vector_engine is None:
        _vector_engine = VectorSearchEngine()
    return _learner, _vector_engine


# --- API Routes ---
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"success": True, "data": {"status": "ok", "service": "sufi-fashion-api"}})


@app.route("/api/payment/<path:subpath>", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def payment_passthrough(subpath: str):
    """
    Backend-to-payment integration bridge.
    Forwards payment requests to the payment service with auth headers intact.
    """
    payment_base = (os.getenv("PAYMENT_SERVICE_URL") or "http://127.0.0.1:5002").rstrip("/")
    query = request.query_string.decode("utf-8")
    target_url = f"{payment_base}/payment/{subpath}" + (f"?{query}" if query else "")

    raw_body = request.get_data() or b""
    content_type = request.headers.get("Content-Type", "application/json")
    req_headers = {
        "Content-Type": content_type,
        "Accept": "application/json",
    }
    auth = request.headers.get("Authorization")
    if auth:
        req_headers["Authorization"] = auth

    upstream_req = urllib.request.Request(
        target_url,
        data=raw_body if request.method in {"POST", "PUT", "PATCH"} else None,
        method=request.method,
        headers=req_headers,
    )

    try:
        with urllib.request.urlopen(upstream_req, timeout=15) as response:
            payload = response.read().decode("utf-8")
            status = response.getcode()
            return app.response_class(payload, status=status, mimetype="application/json")
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8") if hasattr(exc, "read") else ""
        if payload:
            return app.response_class(payload, status=exc.code, mimetype="application/json")
        return jsonify({"success": False, "error": "PAYMENT_UPSTREAM_ERROR"}), exc.code
    except Exception as exc:
        return jsonify({"success": False, "error": "PAYMENT_SERVICE_UNAVAILABLE", "message": str(exc)}), 503


@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename: str):
    response = send_from_directory(UPLOAD_DIR, filename)
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response


@app.route("/api/uploads/review-image", methods=["POST"])
def upload_review_image():
    file = request.files.get("image")
    if file is None:
        return jsonify({"error": "Image file is required"}), 400

    original_name = secure_filename(file.filename or "")
    if original_name == "":
        return jsonify({"error": "Invalid image filename"}), 400

    extension = os.path.splitext(original_name)[1].lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if extension not in allowed:
        return jsonify({"error": "Unsupported image type"}), 400

    generated_name = f"{uuid.uuid4().hex}{extension}"
    save_path = os.path.join(UPLOAD_DIR, generated_name)

    try:
        file.save(save_path)
    except Exception:
        return jsonify({"error": "Unable to save image"}), 500

    base = request.host_url.rstrip("/")
    return jsonify({"url": f"{base}/uploads/{generated_name}"})


@app.route("/api/upload", methods=["POST"])
@require_admin_auth
def upload_admin_media():
    """
    Admin-only media upload used by the admin Product Manager.
    Accepts multipart/form-data with `file`.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    original_name = secure_filename(file.filename or "")
    if original_name == "":
        return jsonify({"error": "Empty file"}), 400

    ext = os.path.splitext(original_name)[1].lower()
    is_video = ext in {".mp4", ".mov", ".webm", ".avi"}
    is_image = ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if not is_video and not is_image:
        return jsonify({"error": "Unsupported file type"}), 400

    unique_id = uuid.uuid4().hex[:12]
    base = request.host_url.rstrip("/")

    try:
        if is_video:
            new_filename = f"vid_{unique_id}{ext}"
            save_path = os.path.join(UPLOAD_DIR, new_filename)
            file.save(save_path)
            return jsonify({"message": "Video uploaded", "url": f"{base}/uploads/{new_filename}"}), 201

        # Image compression pipeline (WEBP)
        try:
            from PIL import Image
        except ImportError:
            Image = None

        if Image is None:
            new_filename = f"raw_{unique_id}{ext}"
            save_path = os.path.join(UPLOAD_DIR, new_filename)
            file.save(save_path)
            return jsonify({"message": "Image uploaded", "url": f"{base}/uploads/{new_filename}"}), 201

        img = Image.open(file.stream)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((1500, 1500), Image.Resampling.LANCZOS)

        new_filename = f"img_{unique_id}.webp"
        save_path = os.path.join(UPLOAD_DIR, new_filename)
        img.save(save_path, "WEBP", quality=75, method=6)
        return jsonify({"message": "Image compressed and uploaded", "url": f"{base}/uploads/{new_filename}"}), 201
    except Exception as exc:
        return jsonify({"error": f"Upload failed: {str(exc)}"}), 500


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = AdminUser.query.filter(func.lower(AdminUser.username) == username.lower()).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_admin_token(user.id)
    return jsonify({"token": token, "admin": user.to_dict()})


@app.route("/api/admin/me", methods=["GET"])
@require_admin_auth
def admin_me():
    return jsonify({"admin": g.admin_user.to_dict()})


@app.route("/api/customer/register", methods=["POST"])
def customer_register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or data.get("name") or "").strip()

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password, and name are required"}), 400

    existing = Customer.query.filter(func.lower(Customer.email) == email).first()
    if existing:
        if existing.password_hash:
            return jsonify({"error": "Email already registered"}), 400
        else:
            existing.full_name = full_name
            existing.password_hash = generate_password_hash(password)
            db.session.commit()
            token = create_customer_token(existing.id)
            return jsonify({"token": token, "customer": existing.to_dict()})

    customer = Customer(
        email=email,
        full_name=full_name,
        password_hash=generate_password_hash(password)
    )
    db.session.add(customer)
    db.session.commit()
    token = create_customer_token(customer.id)
    return jsonify({"token": token, "customer": customer.to_dict()})

@app.route("/api/auth/google", methods=["POST"])
def google_auth():
    """
    Verifies a Google ID Token and signs the user in.
    """
    import requests
    data = request.get_json(silent=True) or {}
    id_token = data.get("id_token") or data.get("credential")
    
    if not id_token:
        return jsonify({"error": "Missing ID token"}), 400
        
    try:
        # Verify token with Google's API
        resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}", timeout=10)
        if resp.status_code != 200:
            return jsonify({"error": "Invalid Google token"}), 401
            
        info = resp.json()
        # Ensure the audience matches if VITE_GOOGLE_CLIENT_ID is set
        # (For now we skip strict aud check to allow frontend-only setup, but in prod we'd check it)
        
        email = info.get("email")
        full_name = info.get("name") or email.split("@")[0]
        
        if not email:
            return jsonify({"error": "Could not retrieve email from Google"}), 400
            
        customer = Customer.query.filter(func.lower(Customer.email) == email.lower()).first()
        if not customer:
            customer = Customer(email=email, full_name=full_name)
            db.session.add(customer)
            db.session.commit()
            
        token = create_customer_token(customer.id)
        return jsonify({
            "token": token, 
            "customer": customer.to_dict(),
            "message": "Authenticated with Google"
        })
    except Exception as e:
        return jsonify({"error": f"Google authentication failed: {str(e)}"}), 500

@app.route("/api/customer/login", methods=["POST"])
def customer_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    customer = Customer.query.filter(func.lower(Customer.email) == email).first()
    if not customer or not customer.password_hash or not check_password_hash(customer.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_customer_token(customer.id)
    return jsonify({"token": token, "customer": customer.to_dict()})

@app.route("/api/customer/me", methods=["GET"])
@require_customer_auth
def customer_me():
    return jsonify({"customer": g.customer.to_dict()})

@app.route("/api/recommendations/personalized", methods=["GET"])
def get_personalized_recommendations():
    token = token_from_request()
    customer = customer_from_token(token)
    
    products = Product.query.filter(Product.is_active.is_(True)).all()
    if not products:
        return jsonify([])
        
    model = get_sentence_model()
        
    import random

    if not customer:
        curated = [p for p in products if any([p.is_featured, p.is_trending, p.is_best_seller, p.is_new_arrival, p.is_on_sale])]
        curated.sort(key=lambda p: p.created_at, reverse=True)
        picked = curated[:4] if curated else random.sample(products, min(4, len(products)))
        return jsonify([p.to_dict() for p in picked])
    
    for p in products:
        if p.id not in _product_embeddings:
            text_rep = f"{p.name} {p.tagline or ''} {p.description or ''} {p.category or ''} {p.top_notes or ''} {p.heart_notes or ''} {p.base_notes or ''}"
            _product_embeddings[p.id] = model.encode(text_rep)

    results = []
    
    if not customer:
        import random
        sampled = random.sample(products, min(4, len(products)))
        return jsonify([p.to_dict() for p in sampled])
        
    ordered_items = OrderItem.query.join(Order).filter(Order.customer_id == customer.id).all()
    ordered_product_ids = {item.product_id for item in ordered_items if item.product_id}
    
    if not ordered_product_ids:
        curated = [p for p in products if any([p.is_featured, p.is_trending, p.is_best_seller, p.is_new_arrival, p.is_on_sale])]
        curated.sort(key=lambda p: p.created_at, reverse=True)
        picked = curated[:4] if curated else random.sample(products, min(4, len(products)))
        return jsonify([p.to_dict() for p in picked])

    purchased_products = Product.query.filter(Product.id.in_(list(ordered_product_ids))).all()
    if model is None:
        matches = simple_recommendations_for_customer(purchased_products, products, limit=4)
        if len(matches) < 4:
            remaining = [p for p in products if p.id not in ordered_product_ids and p.id not in {m.id for m in matches}]
            matches.extend(random.sample(remaining, min(4 - len(matches), len(remaining))))
        return jsonify([p.to_dict() for p in matches])

    import numpy as np

    purchased_embs = []
    try:
        for pid in ordered_product_ids:
            if pid in _product_embeddings:
                purchased_embs.append(_product_embeddings[pid])
    except Exception:
        purchased_embs = []

    if not purchased_embs:
        matches = simple_recommendations_for_customer(purchased_products, products, limit=4)
        if len(matches) < 4:
            remaining = [p for p in products if p.id not in ordered_product_ids and p.id not in {m.id for m in matches}]
            matches.extend(random.sample(remaining, min(4 - len(matches), len(remaining))))
        return jsonify([p.to_dict() for p in matches])
        
    taste_profile = np.mean(purchased_embs, axis=0)
    norm_t = np.linalg.norm(taste_profile)
    
    try:
        for p in products:
            if p.id in ordered_product_ids:
                continue

            prod_emb = _product_embeddings[p.id]
            norm_p = np.linalg.norm(prod_emb)

            if norm_t == 0 or norm_p == 0:
                similarity = 0
            else:
                similarity = np.dot(taste_profile, prod_emb) / (norm_t * norm_p)

            results.append({
                "product": p.to_dict(),
                "score": float(similarity)
            })
    except Exception:
        matches = simple_recommendations_for_customer(purchased_products, products, limit=4)
        if len(matches) < 4:
            remaining = [p for p in products if p.id not in ordered_product_ids and p.id not in {m.id for m in matches}]
            matches.extend(random.sample(remaining, min(4 - len(matches), len(remaining))))
        return jsonify([p.to_dict() for p in matches])
        
    results.sort(key=lambda x: x["score"], reverse=True)
    top_matches = [r["product"] for r in results[:4]]
    
    if len(top_matches) < 4:
        needed = 4 - len(top_matches)
        selected_ids = {p.get("id") for p in top_matches if isinstance(p, dict)}
        remaining = [p for p in products if p.id not in ordered_product_ids and p.id not in selected_ids]
        top_matches.extend([p.to_dict() for p in random.sample(remaining, min(needed, len(remaining)))])
        
    return jsonify(top_matches)


@app.route("/api/admin/overview", methods=["GET"])
@require_admin_auth
def admin_overview():
    total_revenue_cents = (
        db.session.query(func.coalesce(func.sum(Order.total_cents), 0))
        .filter(Order.payment_status == "paid")
        .scalar()
    )
    pending_orders = Order.query.filter(Order.status.in_(["new", "processing"])).count()

    return jsonify(
        {
            "metrics": {
                "products": Product.query.count(),
                "customers": Customer.query.count(),
                "orders": Order.query.count(),
                "pending_orders": pending_orders,
                "revenue_cents": int(total_revenue_cents or 0),
                "revenue": format_cents(int(total_revenue_cents or 0)),
                "db_status": "local" if app.config.get("DB_FALLBACK_ACTIVE") else "supabase"
            }
        }
    )


@app.route("/api/admin/analytics", methods=["GET"])
@require_admin_auth
def admin_analytics():
    # 1. Sales Trends (last 12 months)
    sales_trends = []
    for i in range(11, -1, -1):
        month_start = utc_now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i*30)
        # Simple approximation for month grouping
        month_label = month_start.strftime("%b %Y")
        
        revenue = (
            db.session.query(func.coalesce(func.sum(Order.total_cents), 0))
            .filter(Order.payment_status == "paid", Order.created_at >= month_start)
            .scalar()
        )
        sales_trends.append({"month": month_label, "revenue_cents": int(revenue or 0)})

    # 2. Category Performance
    category_data = (
        db.session.query(
            Product.category,
            func.sum(OrderItem.line_total_cents),
            sa_count(distinct(Order.id)),
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.payment_status == "paid")
        .group_by(Product.category)
        .all()
    )
    categories = [
        {"name": row[0] or "Uncategorized", "revenue_cents": int(row[1] or 0), "order_count": row[2]}
        for row in category_data
    ]

    # 3. Top Products
    top_products_data = (
        db.session.query(Product.name, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total_cents))
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(Order.payment_status == "paid")
        .group_by(Product.id)
        .order_by(func.sum(OrderItem.line_total_cents).desc())
        .limit(5)
        .all()
    )
    top_products = [
        {"name": row[0], "units_sold": row[1], "revenue_cents": int(row[2] or 0)}
        for row in top_products_data
    ]

    # 4. Inventory Alerts
    low_stock = Product.query.filter(Product.inventory_count < 10, Product.is_active.is_(True)).all()

    # 5. Order Fulfillment Pipeline (Business Flow)
    pipeline_data = db.session.query(Order.status, sa_count(Order.id)).group_by(Order.status).all()
    pipeline_flow = {status: count for status, count in pipeline_data}

    # 6. Average Order Value (AOV) & Current Month Revenue
    current_month_start = utc_now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_orders = db.session.query(
        func.sum(Order.total_cents), 
        sa_count(Order.id)
    ).filter(Order.created_at >= current_month_start, Order.payment_status == "paid").first()
    
    current_revenue = current_month_orders[0] or 0
    current_orders = current_month_orders[1] or 0
    aov = (current_revenue / current_orders) if current_orders > 0 else 0

    # 5. Business Health Summary for AI
    ai_guidance_context = {
        "summary": "The business shows steady interest in high-end fragrances.",
        "key_metrics": {
            "retention_estimate": "N/A - History too short",
            "top_performer": top_products[0]["name"] if top_products else "None",
            "stock_risk": len(low_stock) > 0
        },
        "recommendation_prompt": "Analyze the sales trends and category performance to suggest marketing adjustments."
    }

    return jsonify({
        "sales_trends": sales_trends,
        "categories": categories,
        "top_products": top_products,
        "low_stock": [p.to_dict() for p in low_stock],
        "business_flow": {
            "pipeline": pipeline_flow,
            "average_order_value_cents": int(aov),
            "current_month_revenue_cents": int(current_revenue)
        },
        "ai_context": ai_guidance_context
    })


# --- Settings Routes ---

@app.route("/api/settings", methods=["GET"])
def get_public_settings():
    settings = AppSetting.query.all()
    data = {s.key.strip(): s.value for s in settings}
    
    raw_hero = data.get("hero_videos") or data.get("heroVideos")
    hero_vids = []
    if raw_hero:
        try:
            hero_vids = json.loads(raw_hero) if isinstance(raw_hero, str) else raw_hero
        except:
            hero_vids = []
    
    return jsonify({
        "hero_videos": hero_vids if isinstance(hero_vids, list) else [hero_vids] if hero_vids else [],
        "site_name": data.get("site_name", "Sufi Perfumes"),
        "contact_email": data.get("contact_email", ""),
        "support_phone": data.get("support_phone", ""),
        "razorpay_enabled": data.get("razorpay_enabled", "false"),
    })


@app.route("/api/admin/settings", methods=["GET"])
@require_admin_auth
def get_admin_settings():
    settings = AppSetting.query.all()
    return jsonify({s.key: s.value for s in settings})


@app.route("/api/admin/settings", methods=["POST"])
@require_admin_auth
def update_admin_settings():
    data = request.get_json(silent=True) or {}
    for key, value in data.items():
        setting = AppSetting.query.filter_by(key=key).first()
        if setting:
            setting.value = value
        else:
            setting = AppSetting(key=key, value=value)
            db.session.add(setting)
    db.session.commit()
    return jsonify({"message": "Settings updated successfully"})


@app.route("/api/products", methods=["GET"])
def get_products():
    include_inactive = request.args.get("include_inactive", "false").lower() == "true"
    query = Product.query
    if not include_inactive:
        query = query.filter(Product.is_active.is_(True))
    products = query.order_by(Product.created_at.desc()).all()
    return jsonify([p.to_dict() for p in products])


_search_model = None
_search_model_error: str | None = None
_product_embeddings = {}

def get_sentence_model():
    # Machine Learning features disabled per request
    return None


# ═══════════════════════════════════════════════════════════
# HIGH-ACCURACY SEARCH ENGINE (No ML dependency required)
# Uses multi-signal weighted scoring for near-perfect results
# ═══════════════════════════════════════════════════════════

# Common stop-words to skip during tokenization
_STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'is', 'it',
    'to', 'for', 'with', 'by', 'at', 'be', 'as', 'on', 'are',
}


def _tokenize(text: str) -> list[str]:
    """Lowercase, split, remove stop words."""
    if not text:
        return []
    return [
        t for t in re.findall(r"[a-z0-9]+", text.lower())
        if t and t not in _STOP_WORDS and len(t) > 1
    ]


def _score_search(product: 'Product', query: str, query_tokens: list[str]) -> float:
    """
    Multi-signal search scoring — returns a float score.
    Higher = better match.

    Signals (additive, non-exclusive):
      100 — exact name match (case-insensitive)
       80 — name starts with query
       60 — name contains query as substring
       50 — category exact match
       40 — each query token found in name
       35 — each query token found in top/heart/base notes
       30 — category contains query token
       20 — tagline contains query token
       10 — description contains query token
        5 — scent_no / slug contains query token
    """
    q_lower = query.lower().strip()
    score = 0.0

    name      = (product.name       or "").lower()
    tagline   = (product.tagline    or "").lower()
    category  = (product.category   or "").lower()
    desc      = (product.description or "").lower()
    top       = (product.top_notes  or "").lower()
    heart     = (product.heart_notes or "").lower()
    base      = (product.base_notes  or "").lower()
    scent_no  = (product.scent_no   or "").lower()
    slug      = (product.slug       or "").lower()

    all_notes = f"{top} {heart} {base}"

    # ── Exact / prefix / substring matches on name ──
    if name == q_lower:
        score += 100
    elif name.startswith(q_lower):
        score += 80
    elif q_lower in name:
        score += 60

    # ── Category exact match ──
    if category == q_lower:
        score += 50

    # ── Token-level scoring ──
    for token in query_tokens:
        # Name
        if token in name:
            score += 40
        # Notes (most important for perfume search)
        note_tokens = _tokenize(all_notes)
        if token in note_tokens:
            score += 35
        elif token in all_notes:        # partial note word (e.g. 'sandalw')
            score += 20
        # Category
        if token in category:
            score += 30
        # Tagline
        if token in tagline:
            score += 20
        # Description
        if token in desc:
            score += 10
        # Scent number / slug
        if token in scent_no or token in slug:
            score += 5

    # ── Prefix partial: first token matches start of name word ──
    if query_tokens:
        first = query_tokens[0]
        for word in name.split():
            if word.startswith(first) and word != first:
                score += 15
                break

    return score


def basic_product_search(query: str, limit: int = 20) -> list['Product']:
    """High-accuracy multi-signal search, no ML required."""
    query = query.strip()
    if not query:
        return []

    query_tokens = _tokenize(query)
    all_products = Product.query.filter(Product.is_active.is_(True)).all()

    scored = [
        (product, _score_search(product, query, query_tokens))
        for product in all_products
    ]
    # Filter: must have at least some relevance
    scored = [(p, s) for p, s in scored if s > 0]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [p for p, _ in scored[:limit]]


# ═══════════════════════════════════════════════════════════
# HIGH-ACCURACY RECOMMENDATION ENGINE
# Uses weighted multi-factor note/category/ingredient matching
# ═══════════════════════════════════════════════════════════

def _product_note_tokens(product: 'Product') -> set[str]:
    """Extract all meaningful scent tokens from a product."""
    tokens: set[str] = set()
    for field in [product.top_notes, product.heart_notes, product.base_notes]:
        for note in split_notes(field):
            tokens.update(_tokenize(note))
    return tokens


def _product_all_tokens(product: 'Product') -> set[str]:
    """Full token set for broad similarity."""
    tokens = _product_note_tokens(product)
    for field in [product.name, product.tagline, product.description, product.category]:
        tokens.update(_tokenize(field or ''))
    return tokens


def _similarity_score(target: 'Product', candidate: 'Product') -> float:
    """
    Weighted multi-signal similarity score for recommendations.

    Signals:
      3.0x — shared scent notes (most important for perfume)
      2.0x — exact same category
      1.5x — shared category keywords
      1.0x — shared description / name keywords
      0.5x — same 'vibe' (both spicy, both floral, etc.)
    """
    score = 0.0

    # Signal 1: Shared notes (highest weight — core of perfume similarity)
    target_notes = _product_note_tokens(target)
    cand_notes   = _product_note_tokens(candidate)
    if target_notes and cand_notes:
        shared_notes = target_notes & cand_notes
        total_notes  = target_notes | cand_notes
        note_jaccard = len(shared_notes) / len(total_notes) if total_notes else 0
        score += note_jaccard * 3.0
        # Bonus for each exact shared note ingredient
        score += len(shared_notes) * 0.15

    # Signal 2: Category match
    t_cat = (target.category    or "").lower().strip()
    c_cat = (candidate.category or "").lower().strip()
    if t_cat and c_cat:
        if t_cat == c_cat:
            score += 2.0
        else:
            # Partial category overlap (e.g. "PRIVATE BLEND" vs "ORIENTAL")
            t_words = set(_tokenize(t_cat))
            c_words = set(_tokenize(c_cat))
            if t_words & c_words:
                score += 1.0

    # Signal 3: Broad keyword similarity (name + description)
    target_all = _product_all_tokens(target)
    cand_all   = _product_all_tokens(candidate)
    if target_all and cand_all:
        shared_all = target_all & cand_all
        total_all  = target_all | cand_all
        broad_jaccard = len(shared_all) / len(total_all) if total_all else 0
        score += broad_jaccard * 1.0

    # Signal 4: Olfactory family heuristic
    # Group families and give bonus if both belong to same family
    FAMILIES = {
        'floral': {'rose', 'jasmine', 'iris', 'violet', 'tuberose', 'lily', 'peony'},
        'woody':  {'cedar', 'sandalwood', 'vetiver', 'oakmoss', 'patchouli'},
        'oriental': {'amber', 'oud', 'musk', 'incense', 'frankincense', 'myrrh', 'saffron'},
        'fresh':  {'bergamot', 'lemon', 'citrus', 'neroli', 'lavender', 'sea'},
        'spicy':  {'pepper', 'cardamom', 'cinnamon', 'clove', 'ginger'},
        'gourmand': {'vanilla', 'rum', 'tobacco', 'leather', 'caramel'},
    }
    for family, ingredients in FAMILIES.items():
        if (target_notes & ingredients) and (cand_notes & ingredients):
            score += 0.5

    return score


def simple_similar_products(target: 'Product', candidates: list['Product'], limit: int = 4) -> list['Product']:
    """Rank candidates by weighted multi-signal similarity to target."""
    scored = [
        (candidate, _similarity_score(target, candidate))
        for candidate in candidates
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [p for p, _ in scored[:limit]]


def simple_recommendations_for_customer(
    purchased_products: list['Product'],
    candidates: list['Product'],
    limit: int = 4,
) -> list['Product']:
    """Aggregate taste from purchase history, then rank candidates."""
    purchased_ids = {p.id for p in purchased_products}
    # Build a synthetic 'taste profile' product from purchase history
    taste_notes: set[str] = set()
    taste_all:   set[str] = set()
    for p in purchased_products:
        taste_notes.update(_product_note_tokens(p))
        taste_all.update(_product_all_tokens(p))

    scored = []
    for candidate in candidates:
        if candidate.id in purchased_ids:
            continue
        cand_notes = _product_note_tokens(candidate)
        cand_all   = _product_all_tokens(candidate)

        s = 0.0
        if taste_notes and cand_notes:
            shared = taste_notes & cand_notes
            total  = taste_notes | cand_notes
            s += (len(shared) / len(total)) * 3.0 if total else 0
        if taste_all and cand_all:
            shared = taste_all & cand_all
            total  = taste_all | cand_all
            s += (len(shared) / len(total)) * 1.0 if total else 0

        scored.append((candidate, s))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [p for p, _ in scored[:limit]]

@app.route("/api/products/search", methods=["GET"])
def search_products():
    """
    High-accuracy search endpoint.
    Uses multi-signal scoring engine — no ML dependency required.
    Falls back gracefully if sentence-transformers not installed.
    """
    # --- MODULE 10: Security Validation ---
    query = request.args.get("q", "").strip()
    
    # Cache key is versioned so newly added/updated products become searchable immediately.
    query_hash = hashlib.sha256(f"v{SEARCH_INDEX_VERSION}:{query.lower()}".encode()).hexdigest()
    
    # --- MODULE 9: Cache Lookup ---
    cached_data = get_from_cache(query_hash)
    if cached_data:
        cached_data["performance"]["from_cache"] = True
        return jsonify(cached_data)

    if not query:
        # Empty query → return all active products sorted by featured/trending
        all_products = (
            Product.query
            .filter(Product.is_active.is_(True))
            .order_by(
                Product.is_featured.desc(),
                Product.is_best_seller.desc(),
                Product.created_at.desc(),
            )
            .all()
        )
        return jsonify([p.to_dict() for p in all_products])

    # --- PHASE 5: REAL-TIME ML RANKING ---
    learner, vector_engine = get_ai_engines()
    
    # Fetch active products to rank
    products = Product.query.filter(Product.is_active.is_(True)).all()
    product_dicts = [p.to_dict() for p in products]

    ranked_products = None
    try:
        query_vec = vector_engine.get_embedding(query)
        ranked_products = learner.predict_rank(query_vec, product_dicts, user_id=request.args.get("user_id"))
    except Exception as exc:
        print(f"[SEARCH] ML ranking failed, falling back to basic search: {exc}")

    # Fallback to basic multi-signal search if ML ranking failed
    if not ranked_products:
        basic_results = basic_product_search(query, limit=20)
        ranked_products = [p.to_dict() for p in basic_results] if basic_results else []

    # If still empty, return empty array (frontend expects array)
    if not ranked_products:
        return jsonify([])

    # --- MODULE 1-7: SEO Routing Engine (enrichment layer) ---
    seo_data = None
    try:
        engine = SEORoutingEngine(ranked_products)
        result = engine.process_query(query)
        if result.get("success"):
            seo_data = result["data"]
    except Exception as e:
        print(f"[SEARCH] SEO Engine enrichment failed (non-fatal): {e}")

    # Always return the full product dicts so frontend can render cards
    return jsonify(ranked_products)


@app.route("/api/products/<int:product_id>/similar", methods=["GET"])
def get_similar_products(product_id: int):
    """
    High-accuracy recommendation endpoint.
    Returns 4 most similar products using weighted multi-signal scoring.
    """
    product = db.session.get(Product, product_id)
    if product is None or not product.is_active:
        return jsonify({"error": "Product not found"}), 404

    candidates = Product.query.filter(
        Product.is_active.is_(True),
        Product.id != product_id,
    ).all()

    matches = simple_similar_products(product, candidates, limit=4)

    # Fallback: if not enough similar products found, fill with featured
    if len(matches) < 4:
        existing_ids = {p.id for p in matches} | {product_id}
        extras = [
            p for p in candidates
            if p.id not in existing_ids and (p.is_featured or p.is_best_seller)
        ]
        matches += extras[:4 - len(matches)]

    return jsonify([p.to_dict() for p in matches])


@app.route("/api/products/<id>", methods=["GET"])
def get_product(id):
    try:
        product_id = int(str(id))
    except ValueError:
        return jsonify({"success": False, "error": "PRODUCT_NOT_FOUND"}), 404
        
    product = db.session.get(Product, product_id)
    if product is None or not product.is_active:
        return jsonify({"error": "Product not found"}), 404
        
    product_data = product.to_dict()
    
    # --- MODULE 8: Frontend SEO Injection ---
    optimizer = ProductSEOOptimizer()
    seo_data = optimizer.optimize_product(product_data)
    
    return jsonify({
        "product": product_data,
        "seo": seo_data["seo"] if seo_data["success"] else None,
        "schema": seo_data["schema"] if seo_data["success"] else None,
        "internal_links": seo_data["internal_links"] if seo_data["success"] else None
    })


@app.route("/api/products/<int:product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "Product not found"}), 404

    reviews = (
        ProductReview.query.filter(
            ProductReview.product_id == product_id,
            ProductReview.is_approved.is_(True),
        )
        .order_by(ProductReview.created_at.desc())
        .all()
    )

    average_rating = average_rating_for_product(product_id)
    return jsonify(
        {
            "summary": {
                "count": len(reviews),
                "average_rating": average_rating,
            },
            "reviews": [review.to_dict() for review in reviews],
        }
    )


@app.route("/api/products/<int:product_id>/reviews", methods=["POST"])
def add_product_review(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None or not product.is_active:
        return jsonify({"error": "Product not found"}), 404

    payload = request.get_json(silent=True) or {}
    reviewer_name = (payload.get("reviewer_name") or payload.get("name") or "").strip()
    reviewer_email = (payload.get("reviewer_email") or payload.get("email") or "").strip().lower()
    comment = (payload.get("comment") or "").strip()
    image_url = (payload.get("image_url") or "").strip() or None

    try:
        rating = int(payload.get("rating"))
    except (TypeError, ValueError):
        rating = 0

    if not reviewer_name:
        return jsonify({"error": "Reviewer name is required"}), 400
    if len(comment) < 5:
        return jsonify({"error": "Comment should be at least 5 characters"}), 400
    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5"}), 400

    review = ProductReview(
        product_id=product.id,
        reviewer_name=reviewer_name,
        reviewer_email=reviewer_email or None,
        rating=rating,
        comment=comment,
        image_url=image_url,
        is_approved=True,
    )

    db.session.add(review)
    db.session.commit()
    return jsonify({"message": "Review added", "review": review.to_dict()}), 201


@app.route("/api/products", methods=["POST"])
@require_admin_auth
def create_product():
    payload = request.get_json(silent=True) or {}
    try:
        product = Product(name="", slug="temp", price_cents=0)
        apply_product_payload(product, payload)
        product.slug = build_unique_slug(payload.get("slug") or product.name)
        db.session.add(product)
        db.session.commit()
        _product_embeddings.pop(product.id, None)
        bump_search_index_version()
        
        # --- MODULE: Product-Level SEO Optimization ---
        optimizer = ProductSEOOptimizer()
        seo_result = optimizer.optimize_product(product.to_dict())
        
        # MODULE 1: Persistent Embedding & SEO Storage
        if seo_result.get("success"):
            product.embedding_json = seo_result.get("embedding_json")
            product.seo_metadata = seo_result.get("seo")
            db.session.commit()
        
        # --- MODULE 13: Instant Indexing Dare ---
        sitemap_url = f"{request.host_url}sitemap.xml"
        ping_results = optimizer.ping_search_engines(sitemap_url)
        
        return jsonify({
            "message": "Product created", 
            "product": product.to_dict(),
            "seo_optimization": seo_result,
            "indexing_status": ping_results
        }), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Unable to create product: {exc}"}), 500


@app.route("/api/products/<int:product_id>", methods=["PUT"])
@require_admin_auth
def update_product(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "Product not found"}), 404

    payload = request.get_json(silent=True) or {}
    try:
        apply_product_payload(product, payload)
        db.session.commit()
        _product_embeddings.pop(product.id, None)
        bump_search_index_version()
        
        # --- MODULE: Product-Level SEO Optimization ---
        optimizer = ProductSEOOptimizer()
        seo_result = optimizer.optimize_product(product.to_dict())
        
        # MODULE 1: Persistent Embedding & SEO Storage
        if seo_result.get("success"):
            product.embedding_json = seo_result.get("embedding_json")
            product.seo_metadata = seo_result.get("seo")
            db.session.commit()
            
        return jsonify({
            "message": "Product updated", 
            "product": product.to_dict(),
            "seo_optimization": seo_result
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Unable to update product: {exc}"}), 500


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
@require_admin_auth
def delete_product(product_id: int):
    product = db.session.get(Product, product_id)
    if product is None:
        return jsonify({"error": "Product not found"}), 404

    try:
        _product_embeddings.pop(product.id, None)
        db.session.delete(product)
        db.session.commit()
        bump_search_index_version()
        return jsonify({"message": "Product deleted"})
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Unable to delete product: {exc}"}), 500


@app.route("/api/customers", methods=["GET"])
@require_admin_auth
def get_customers():
    # Only show non-deleted customers in the vault
    customers = Customer.query.filter_by(is_deleted=False).order_by(Customer.created_at.desc()).all()
    return jsonify([c.to_dict(include_orders=True) for c in customers])


@app.route("/api/customers", methods=["POST"])
@require_admin_auth
def create_customer():
    payload = request.get_json(silent=True) or {}
    try:
        customer = find_or_create_customer(payload)
        db.session.commit()
        return jsonify({"message": "Customer saved", "customer": customer.to_dict(include_orders=True)}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Unable to save customer: {exc}"}), 500


@app.route("/api/customers/<int:customer_id>", methods=["PUT"])
@require_admin_auth
def update_customer(customer_id: int):
    customer = db.session.get(Customer, customer_id)
    if customer is None:
        return jsonify({"error": "Customer not found"}), 404

    payload = request.get_json(silent=True) or {}
    full_name = (payload.get("full_name") or customer.full_name or "").strip()
    email = (payload.get("email") or customer.email or "").strip().lower()

    if not full_name or not email:
        return jsonify({"error": "full_name and email are required"}), 400

    existing = Customer.query.filter(func.lower(Customer.email) == email, Customer.id != customer.id).first()
    if existing:
        return jsonify({"error": "Email is already in use"}), 400

    customer.full_name = full_name
    customer.email = email
    customer.phone = (payload.get("phone") or "").strip() or None
    customer.city = (payload.get("city") or "").strip() or None
    customer.state = (payload.get("state") or "").strip() or None
    customer.country = (payload.get("country") or "").strip() or None

    db.session.commit()
    return jsonify({"message": "Customer updated", "customer": customer.to_dict(include_orders=True)})


@app.route("/api/customers/<int:customer_id>", methods=["DELETE"])
@require_admin_auth
def delete_customer(customer_id: int):
    print(f"[DEBUG] Soft deleting customer ID: {customer_id}")
    customer = db.session.get(Customer, customer_id)
    if customer is None:
        return jsonify({"error": "Customer not found"}), 404

    try:
        # 1. Mark customer as deleted (Hides from Vault)
        customer.is_deleted = True
        
        # 2. Automatically cancel all their orders
        for order in customer.orders:
            print(f"[DEBUG] Cancelling order {order.id} for soft-deleted customer")
            order.status = 'cancelled'
            # We don't mark the order as is_deleted=True here unless you want them hidden from everywhere
            
        db.session.commit()
        return jsonify({"message": "Customer removed from vault and all orders cancelled"})
    except Exception as exc:
        print(f"[DEBUG] Soft delete failed: {exc}")
        db.session.rollback()
        return jsonify({"error": f"Unable to remove customer: {exc}"}), 500


@app.route("/api/orders", methods=["GET"])
@require_admin_auth
def get_orders():
    # Only show non-deleted orders in the main order manager
    orders = Order.query.filter_by(is_deleted=False).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@app.route("/api/orders", methods=["POST"])
def create_order():
    if app.config.get("DB_DEGRADED"):
        return (
            jsonify(
                {
                    "error": "DB_NOT_CONNECTED",
                    "message": "Primary database is not connected. Orders are temporarily unavailable.",
                    "debug": {
                        "db_saved": False,
                        "payment_processed": False,
                        "errors": [app.config.get("DB_DEGRADED_REASON") or "UNKNOWN"],
                        "db_fallback_active": bool(app.config.get("DB_FALLBACK_ACTIVE")),
                    },
                }
            ),
            503,
        )

    payload = request.get_json(silent=True) or {}
    customer_data = payload.get("customer") or {}
    items_data = payload.get("items") or []

    if not isinstance(items_data, list) or len(items_data) == 0:
        return jsonify({"error": "At least one order item is required"}), 400

    try:
        customer = find_or_create_customer(customer_data)

        subtotal_cents = 0
        order_items: list[OrderItem] = []

        for row in items_data:
            product_id = row.get("product_id")
            qty = row.get("quantity", 1)
            try:
                qty = max(int(qty), 1)
            except (TypeError, ValueError):
                qty = 1

            product = db.session.get(Product, int(product_id)) if product_id is not None else None
            if product is None or not product.is_active:
                raise ValueError(f"Invalid product id: {product_id}")

            if product.inventory_count < qty:
                raise ValueError(f"Insufficient inventory for {product.name}")

            product.inventory_count -= qty
            line_total = product.price_cents * qty
            subtotal_cents += line_total

            order_items.append(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    unit_price_cents=product.price_cents,
                    quantity=qty,
                    line_total_cents=line_total,
                )
            )

        shipping_cents = parse_price_to_cents(payload.get("shipping_cents"), 0)
        tax_cents = parse_price_to_cents(payload.get("tax_cents"), 0)
        total_cents = subtotal_cents + shipping_cents + tax_cents

        shipping_address = payload.get("shipping_address") or {}
        if not isinstance(shipping_address, dict):
            shipping_address = {}

        if not shipping_address:
            shipping_address = {
                "full_name": customer.full_name,
                "email": customer.email,
                "phone": customer.phone,
                "address": (customer_data.get("address") or "").strip() or None,
                "city": customer.city,
                "state": customer.state,
                "country": customer.country,
            }

        payment_method = (payload.get("payment_method") or "cod").strip().lower()
        if payment_method not in {"cod", "upi"}:
            payment_method = "cod"

        payment_details = payload.get("payment_details")
        if payment_details is not None and not isinstance(
            payment_details, (dict, list, str, int, float, bool)
        ):
            payment_details = str(payment_details)

        payment_details_obj = None
        if isinstance(payment_details, dict):
            payment_details_obj = dict(payment_details)
        elif isinstance(payment_details, list):
            payment_details_obj = {"details": payment_details}
        elif payment_details is not None:
            payment_details_obj = {"details": str(payment_details)}

        upi_used = None
        generated_order_number = order_number()
        if payment_method == "upi":
            keys = {"upi_id", "upi_owner_name", "upi_owner_phone", "upi_owner_note"}
            settings = AppSetting.query.filter(AppSetting.key.in_(keys)).all()
            values = {s.key: s.value for s in settings}
            upi_id_value = (values.get("upi_id") or "").strip()
            if not upi_id_value:
                raise ValueError("UPI is not configured. Please choose Cash on Delivery or try later.")

            upi_used = upi_id_value
            if payment_details_obj is None:
                payment_details_obj = {}
            payment_details_obj.update(
                {
                    "method": "upi",
                    "upi_id": upi_id_value,
                    "upi_owner_name": (values.get("upi_owner_name") or "").strip(),
                    "upi_owner_phone": (values.get("upi_owner_phone") or "").strip(),
                    "upi_owner_note": (values.get("upi_owner_note") or "").strip(),
                    "upi_reference": generated_order_number,
                }
            )

        order = Order(
            order_number=generated_order_number,
            customer=customer,
            status="new",
            payment_status="pending",
            payment_method=payment_method,
            payment_details=json.dumps(payment_details_obj) if payment_details_obj is not None else None,
            subtotal_cents=subtotal_cents,
            shipping_cents=shipping_cents,
            tax_cents=tax_cents,
            total_cents=total_cents,
            notes=(payload.get("notes") or "").strip() or None,
            shipping_address=json.dumps(shipping_address),
        )

        db.session.add(order)
        db.session.flush()

        for item in order_items:
            item.order_id = order.id
            db.session.add(item)

        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Order placed",
                    "order": order.to_dict(),
                    "debug": {
                        "db_saved": True,
                        "payment_processed": False,
                        "upi_used": upi_used,
                        "db_fallback_active": bool(app.config.get("DB_FALLBACK_ACTIVE")),
                        "errors": None,
                    },
                }
            ),
            201,
        )
    except ValueError as exc:
        db.session.rollback()
        return (
            jsonify(
                {
                    "error": "INVALID_REQUEST",
                    "message": str(exc),
                    "debug": {
                        "db_saved": False,
                        "payment_processed": False,
                        "errors": [str(exc)],
                    },
                }
            ),
            400,
        )
    except Exception as exc:
        db.session.rollback()
        return (
            jsonify(
                {
                    "error": "PAYMENT_FAILED",
                    "message": f"Unable to create order: {exc}",
                    "debug": {
                        "db_saved": False,
                        "payment_processed": False,
                        "errors": [str(exc)],
                    },
                }
            ),
            500,
        )


@app.route("/api/orders/<int:order_id>", methods=["PATCH"])
@require_admin_auth
def update_order(order_id: int):
    order = db.session.get(Order, order_id)
    if order is None:
        return jsonify({"error": "Order not found"}), 404

    payload = request.get_json(silent=True) or {}
    allowed_statuses = {"new", "processing", "shipped", "delivered", "cancelled"}
    allowed_payment = {"pending", "paid", "failed", "refunded"}

    status = payload.get("status")
    payment_status = payload.get("payment_status")

    if status:
        if status not in allowed_statuses:
            return jsonify({"error": "Invalid order status"}), 400
        order.status = status

    if payment_status:
        if payment_status not in allowed_payment:
            return jsonify({"error": "Invalid payment status"}), 400
        order.payment_status = payment_status

    if "notes" in payload:
        order.notes = (payload.get("notes") or "").strip() or None

    db.session.commit()
    return jsonify({"message": "Order updated", "order": order.to_dict()})


@app.route("/api/orders/<int:order_id>", methods=["DELETE"])
@require_admin_auth
def delete_order(order_id: int):
    order = db.session.get(Order, order_id)
    if order is None:
        return jsonify({"error": "Order not found"}), 404

    try:
        # Soft Delete Logic:
        # 1. Mark as cancelled so the user sees it in their browser
        order.status = 'cancelled'
        # 2. Mark as deleted so it is hidden from the Admin dashboard
        order.is_deleted = True
        
        db.session.commit()
        return jsonify({"message": "Order cancelled and removed from dashboard"})
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Unable to remove order: {exc}"}), 500

@app.route("/api/my-orders", methods=["GET"])
def get_my_orders():
    email = request.args.get("email")
    if not email:
        return jsonify([]), 200
    customer = Customer.query.filter(func.lower(Customer.email) == email.lower()).first()
    if not customer:
        return jsonify([]), 200
    orders = Order.query.filter_by(customer_id=customer.id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@app.route("/api/orders/<int:order_id>/cancel", methods=["POST"])
def cancel_order(order_id):
    payload = request.get_json(silent=True) or {}
    email = payload.get("email")
    if not email:
        return jsonify({"error": "Email is required to verify ownership"}), 400
        
    order = db.session.get(Order, order_id)
    if not order or order.customer.email.lower() != email.lower():
        return jsonify({"error": "Order not found or unauthorized"}), 404
    
    if order.status in ["shipped", "delivered", "cancelled"]:
        return jsonify({"error": f"Cannot cancel order that is already {order.status}"}), 400
        
    order.status = "cancelled"
    db.session.commit()
    return jsonify({"message": "Order cancelled successfully", "order": order.to_dict()})

@app.route("/api/webhooks/stripe", methods=["POST"])
def stripe_webhook():
    """
    Simulated Stripe Webhook endpoint.
    In a real app, you would verify the Stripe signature here using stripe.Webhook.construct_event.
    """
    enabled = os.getenv("STRIPE_WEBHOOK_ENABLED", "").strip().lower() in {"1", "true", "yes"}
    secret = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
    if not enabled or not secret:
        return jsonify({"error": "WEBHOOK_DISABLED", "message": "Stripe webhook is disabled on this server."}), 501

    provided = (request.headers.get("x-webhook-secret") or "").strip()
    if provided != secret:
        return jsonify({"error": "UNAUTHORIZED", "message": "Invalid webhook secret."}), 401

    payload = request.get_json(silent=True) or {}
    
    # We expect an event type from Stripe
    event_type = payload.get("type")
    
    if event_type == "checkout.session.completed":
        session_data = payload.get("data", {}).get("object", {})
        
        # Stripe allows passing custom data. We pass the order_number as client_reference_id
        order_number = session_data.get("client_reference_id")
        
        if order_number:
            order = Order.query.filter_by(order_number=order_number).first()
            if order:
                order.payment_status = "paid"
                order.status = "processing"
                # Store the Stripe Session ID in payment_details for future reference
                order.payment_details = json.dumps({"stripe_session_id": session_data.get("id")})
                db.session.commit()
                
                print(f"✅ Webhook received: Order {order_number} marked as paid.")
                return jsonify({"status": "success", "message": f"Order {order_number} paid."}), 200
                
    # If it's a different event type or missing data, we just return 200 to acknowledge receipt
    return jsonify({"status": "ignored"}), 200


# --- MODULE 8: Sitemap Engine (Dynamic XML) ---
@app.route("/sitemap.xml", methods=["GET"])
def sitemap():
    """
    Generates a dynamic XML sitemap of all active products and main categories.
    """
    base_url = request.host_url.rstrip("/")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # 1. Home
    xml += f'  <url><loc>{base_url}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n'
    
    # 2. Main Categories
    categories = db.session.query(distinct(Product.category)).all()
    for cat in categories:
        if cat[0]:
            slug = slugify(cat[0])
            xml += f'  <url><loc>{base_url}/perfume/{slug}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>\n'
            
    # 3. All Products
    products = Product.query.filter(Product.is_active.is_(True)).all()
    for p in products:
        xml += f'  <url><loc>{base_url}/product/{p.slug}</loc><lastmod>{dt_iso(p.updated_at)}</lastmod><priority>0.7</priority><changefreq>monthly</changefreq></url>\n'
        
    xml += '</urlset>'
    return xml, 200, {'Content-Type': 'application/xml'}


# --- MODULE 11: Analytics Feedback Loop ---
@app.route("/api/analytics/track", methods=["POST"])
def track_event():
    """
    TASK 1.6: Real-time User Vector Update
    """
    payload = request.get_json(silent=True) or {}
    user_id = str(payload.get("user_id", ""))[:50]
    event_type = str(payload.get("event", "view"))[:20]
    data = payload.get("data", {})
    product_id = data.get("product_id")
    
    if not user_id:
        return jsonify({"success": False, "error": "MISSING_USER_ID"}), 400

    try:
        # 1. Log to DB
        event = UserEvent(
            user_id=user_id,
            event_type=event_type,
            product_id=product_id,
            ab_group=payload.get("ab_group") or ExperimentEngine.get_group(user_id),
            search_query=data.get("query", "")
        )
        db.session.add(event)
        
        # 2. Update Production Product Metrics (Revenue optimization)
        if product_id:
            product = db.session.get(Product, product_id)
            if product:
                if event_type == "view": product.views_count += 1
                if event_type in ["purchase", "sale"]: product.sales_count += 1
                
                # 3. TASK 1: Incremental User Vector Update
                try:
                    from seo_engine import LearningEngine
                except ModuleNotFoundError:
                    from .seo_engine import LearningEngine
                learner = LearningEngine()
                p_vec = np.array(json.loads(product.embedding_json)) if product.embedding_json else None
                if p_vec is not None:
                    learner.update_user_vector(user_id, product_id, event_type, p_vec)
                    
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# --- MODULE 8: PERFORMANCE CACHE ---
REC_CACHE = {} # {key: {data: [], expires: timestamp}}

def get_rec_cache(key):
    entry = REC_CACHE.get(key)
    if entry and entry['expires'] > time.time():
        return entry['data']
    return None

def set_rec_cache(key, data, ttl=300):
    REC_CACHE[key] = {
        'data': data,
        'expires': time.time() + ttl
    }

# --- RECOMMENDATION DELIVERY LAYER (HARDENED) ---
@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():
    """
    MODULE 11: API Contract Validation
    """
    # MODULE 9: Security Validation
    mode = request.args.get("mode", "homepage")[:20]
    product_id = request.args.get("product_id", type=int)
    user_id = request.args.get("user_id", "")[:50]
    session_id = request.args.get("session_id", "")[:50]
    
    # MODULE 8: Performance Hardening (Cache Lookup)
    cache_key = f"rec_{mode}_{product_id}_{user_id}_{session_id}"
    cached = get_rec_cache(cache_key)
    if cached:
        return jsonify({
            "results": cached,
            "metadata": {"cache_status": "HIT", "engine": "Hardened AI v2"},
            "confidence_score": 0.95
        })

    try:
        from seo_engine import LearningEngine, VectorSearchEngine, ExperimentEngine
    except ModuleNotFoundError:
        from .seo_engine import LearningEngine, VectorSearchEngine, ExperimentEngine
    learner = LearningEngine()
    experiment = ExperimentEngine()
    vector_engine = VectorSearchEngine()
    
    # 1. Assign A/B Group
    ab_group = experiment.get_group(user_id)
    
    # 2. Batch DB Fetch
    all_products = Product.query.filter(Product.is_active.is_(True)).all()
    candidate_dicts = [p.to_dict() for p in all_products]
    
    # 3. Strategy Selection
    if ab_group == "A":
        # Group A (Control): Popularity-based
        recommendations = experiment.get_control_recommendations(candidate_dicts)
        strategy = "popularity_control"
    else:
        # Group B (Treatment): Full Hybrid AI
        query_text = "luxury perfume"
        if mode == "product_page" and product_id:
            p = db.session.get(Product, product_id)
            if p: query_text = p.name
        
        query_vec = vector_engine.get_embedding(query_text)
        results = learner.predict_rank(query_vec, candidate_dicts, user_id=user_id, session_id=session_id)
        recommendations = results[:10]
        strategy = "hybrid_v2_robust"
    
    # 4. Impression Tracking with Group
    try:
        for idx, p in enumerate(recommendations):
            event = UserEvent(
                user_id=user_id,
                event_type="impression",
                product_id=p['id'],
                ab_group=ab_group,
                search_query=f"pos:{idx+1}"
            )
            db.session.add(event)
        db.session.commit()
    except:
        pass

    set_rec_cache(cache_key, recommendations)

    return jsonify({
        "results": recommendations,
        "metadata": {
            "ab_group": ab_group,
            "strategy": strategy,
            "cache_status": "MISS"
        },
        "debug": learner.last_debug if ab_group == "B" else {}
    })

with app.app_context():
    db.create_all()
    # Senior Dev Hack: Auto-migrate existing SQLite tables if columns are missing
    try:
        from sqlalchemy import text
        db.session.execute(text("ALTER TABLE customer ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL"))
        db.session.commit()
        print("Migrated 'customer' table: added 'is_deleted'")
    except Exception:
        db.session.rollback()
        
    try:
        from sqlalchemy import text
        # Using double quotes for "order" because it is a reserved word in many SQL dialects
        db.session.execute(text('ALTER TABLE "order" ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL'))
        db.session.commit()
        print("Migrated 'order' table: added 'is_deleted'")
    except Exception:
        db.session.rollback()

    ensure_product_schema()
    seed_initial_data()


# --- PHASE 4: TRAINING PIPELINE (SELF-LEARNING LOOP) ---
import threading

def run_self_learning_loop():
    """
    Scheduled job: Retrains the ranking model using historical interaction data.
    Runs every 12 hours.
    """
    while True:
        try:
            print("🚀 [SELF-LEARNING] Starting training loop...")
            with app.app_context():
                # Fetch last 30 days of events
                thirty_days_ago = utc_now() - timedelta(days=30)
                events = UserEvent.query.filter(UserEvent.timestamp >= thirty_days_ago).all()
                event_dicts = [e.to_dict() for e in events]
                
                # Fetch all products for feature building
                products = Product.query.filter(Product.is_active.is_(True)).all()
                product_dicts = [p.to_dict() for p in products]
                
                try:
                    from seo_engine import LearningEngine
                except ModuleNotFoundError:
                    from .seo_engine import LearningEngine
                engine = LearningEngine()
                engine.train_model(event_dicts, product_dicts)
                
            print("✅ [SELF-LEARNING] Model updated successfully.")
        except Exception as e:
            print(f"❌ [SELF-LEARNING] Training failed: {e}")
            
        time.sleep(12 * 3600) # 12 hour cycle

# ML Threads removed.


if __name__ == "__main__":
    app.run(debug=True, port=5000)
