# ⚙️ MASTER BACKEND BLUEPRINT: UNIVERSAL E-COMMERCE ENGINE
## "The Technical Soul of a Scalable Storefront"

This document defines the backend architecture, database schema, and logic flows for a high-performance e-commerce platform. It is designed to be a complete reference for recreating the server-side engine for any product-based business.

---

### 1. 📂 ARCHITECTURAL OVERVIEW
The system is built as a **Decoupled REST API** using Python (Flask) and a Relational Database (PostgreSQL).

#### Key Pillars:
- **Relational Integrity**: Strict foreign key relationships between Products, Variants, and Orders.
- **Stateless Auth**: JWT-based session management for security and scalability.
- **Dynamic Pricing**: A real-time engine that calculates prices based on selected variants and active discounts.
- **SEO Automation**: Background processes that manage search engine visibility without manual intervention.

---

### 2. 🗄️ DATABASE ARCHITECTURE (The Data Core)

#### 2.1. Product Schema
The `Product` table is the central source of truth. It stores metadata, base pricing, and status.
- `id`: (Integer, PK)
- `slug`: (String, Unique) - SEO-friendly URL identifier.
- `price_cents`: (Integer) - All prices are stored in **Cents** to avoid floating-point math errors.
- `compare_at_price_cents`: (Integer) - Optional original price for discount display.
- `inventory_count`: (Integer) - Stock tracking.
- `variants_json`: (JSON) - Stores size/color/type variations and their specific price overrides.
- `meta_json`: (JSON) - Flexible field for storing product-specific attributes (e.g., "Weight", "Material", "Fragrance Notes").

#### 2.2. User & Auth Schema
- `id`: (Integer, PK)
- `email`: (String, Unique)
- `password_hash`: (String) - SHA-256 hashed password.
- `role`: (String) - "admin" or "customer".

#### 2.3. Order Lifecycle Schema
- `order_number`: (String, Unique) - Human-readable ID.
- `user_id`: (Integer, FK)
- `status`: (Enum: `NEW`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- `total_cents`: (Integer) - The final charged amount.
- `items_json`: (JSON) - Snapshot of products bought (prevents price-change issues).

---

### 3. 🔐 AUTHENTICATION ENGINE (OTP & JWT)

#### 3.1. OTP Generation & Verification
The system uses a **Cryptographically Secure OTP Flow**:
1. **Request**: `secrets.token_hex(3)` generates a 6-digit alphanumeric or numeric code.
2. **Hashing**: The backend hashes the code using `hashlib.sha256(code + salt)`.
3. **Storage**: The hash is stored with a 10-minute TTL (Time-To-Live).
4. **Verification**: User input is hashed and compared to the stored hash.

#### 3.2. Session Security
Upon successful login/OTP verification, the backend issues a **JWT (JSON Web Token)**:
- **Header**: Algorithm & Type.
- **Payload**: `user_id`, `role`, and `exp` (expiry).
- **Signature**: Signed with a `JWT_SECRET` key from the environment.

---

### 4. 💸 PRICING & INVENTORY LOGIC

#### 4.1. Variant Price Override
The engine calculates the final price at the moment of checkout:
1. Check `variants_json` for a match on the selected option (e.g., "50ML").
2. If a `price` is found in the JSON, it **overrides** the base `price_cents`.
3. If no variant price exists, it defaults to the product's base price.

#### 4.2. Discount Calculation
- **Logic**: `Discount % = ((ComparePrice - SalePrice) / ComparePrice) * 100`.
- This is performed in the API response so the frontend only needs to render the result.

---

### 5. 🔍 AUTOMATED SEO & SEARCH INDEXING

#### 5.1. Dynamic Sitemap Builder
- The backend features a route (`/sitemap.xml`) that queries the database and builds a standard XML feed.
- It automatically includes all active `slugs` and `last_updated` timestamps.

#### 5.2. Search Engine "Ping" System
- **Trigger**: Every `POST /api/products` (Create) or `PUT` (Update).
- **Action**: The server sends an automated HTTP GET to Google's indexing service.
- **Impact**: New products are indexed without the need for manual Search Console uploads.

---

### 6. 🛠️ ADMIN CONTROL & MEDIA HANDLING

#### 6.1. Generic Admin Controller
The Admin UI interacts with the backend via **Protected Endpoints** (`/api/admin/*`):
- **Bulk Updates**: Update stock levels across multiple IDs.
- **Media Upload**: Handles `multipart/form-data`. Files are stored in a dedicated `/uploads` folder or S3, and the URL is saved to the DB.

---

### 7. 🚀 THE MASTER .ENV TEMPLATE
The system requires these keys to operate the core engine:

```env
# ── DATABASE ──
DATABASE_URL="postgresql://user:pass@host:5432/db"

# ── AUTHENTICATION ──
JWT_SECRET="generate-a-long-random-string-here"
GMAIL_USER="your-email@gmail.com"
GMAIL_PASS="your-app-password-here"

# ── PAYMENTS ──
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-secret-here"

# ── SITE CONFIG ──
BASE_URL="https://your-domain.com"
```

---

*This blueprint provides the complete backend "soul" for any storefront. The developer can now build any UI/UX on top of this robust engine.*

---

### 8. 🔐 GOOGLE OAUTH INFRASTRUCTURE (RECOVERY & STABILIZATION)

#### 8.1. The "IP-Only" Protocol (127.0.0.1)
To eliminate `redirect_uri_mismatch` and CORS conflicts, the system enforces a strict IP-based architecture. 
- **Reasoning**: Google treats `localhost` and `127.0.0.1` as different origins. Standardizing on `127.0.0.1` across `.env`, Google Console, and CORS middleware ensures a perfect handshake.
- **Enforcement**: 
    - `GOOGLE_CALLBACK_URL=http://127.0.0.1:5001/auth/google/callback`
    - `FRONTEND_URL=http://127.0.0.1:5173`

#### 8.2. Vite HMR & WebSocket Stabilization
A common failure in development is the "WebSocket Connection Failed" error after OAuth redirects.
- **Issue**: Appending a JWT token to the root URL (`/?token=...`) corrupts the Vite HMR lifecycle.
- **Fix**: Hardened `vite.config.js` to pin the HMR host and introduced a dedicated landing route.
- **HMR Config**:
  ```javascript
  hmr: { host: '127.0.0.1', protocol: 'ws', port: 5173 }
  ```

#### 8.3. The "Landing Pad" Architecture (`/auth-success`)
The authentication flow is segregated from the main application state to prevent race conditions and HMR crashes.
1. **Redirect**: Backend redirects to `/auth-success?token=JWT`.
2. **Extraction**: The `AuthSuccess.jsx` component extracts the token via `URLSearchParams`.
3. **Purge**: The component immediately runs `window.history.replaceState` to clear the token from the URL bar, preventing accidental leaks.
4. **Synchronization**: Once the token is in `localStorage`, the component performs a clean navigation to the dashboard.

#### 8.4. Enterprise Telemetry
The Auth Service includes mandatory **[OAUTH-DEBUG]** and **[PASSPORT-DEBUG]** blocks. 
- **Visibility**: Every handshake logs the `Client ID`, `Callback URI`, and `Google Profile` data to the terminal.
- **Security**: Logs verify the *existence* of the `Client Secret` without printing the actual key.
