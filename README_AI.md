# AI ANALYTICS & ARCHITECTURE SPECIFICATION (README_AI)

This document is optimized for AI agents to quickly parse the architecture, logic, and state of the **Sufi Perfumes** platform.

---

## 🏗️ SYSTEM ARCHITECTURE
- **Type**: Full-Stack Monorepo (React + Flask).
- **Frontend**: Vite-based SPA, Tailwind CSS, Framer Motion.
- **Backend**: Python Flask (REST API), SQLite Database.
- **AI Core**: `sentence-transformers` utilizing the `all-mpnet-base-v2` model.

---

## 💾 DATA MODELS (SQLAlchemy)
- **Product**: Core inventory. Includes `is_featured`, `is_trending`, `is_new_arrival`, `is_limited_edition`, `is_best_seller`, `is_on_sale`, `sale_price_cents`, `narrative_image`, `narrative_description`.
- **Customer**: User accounts. Supports `password_hash` (Werkzeug security).
- **Order / OrderItem**: Sales tracking and purchase history.
- **ProductReview**: User feedback loop.
- **AppSetting**: Key-value pair configuration for store-wide settings (e.g., UPI IDs).
- **AdminUser**: Administrative access control.

---

## 🧠 LOGIC & AI MODULES

### 1. Personalized Recommendation Engine
- **Endpoint**: `/api/recommendations/personalized`
- **Method**: 
    1. Retrieve customer's entire purchase history.
    2. Extract vector embeddings for all purchased items.
    3. **Mathematical Center**: Calculates the mean vector (Numpy mean) of all purchased embeddings to create a **"Taste Profile"**.
    4. **Similarity Match**: Performs **Cosine Similarity** between the Taste Profile and all active products in the database.
    5. Returns the top 4 matches (excluding already purchased items where possible).

### 2. Database Migration Strategy
- **Function**: `ensure_product_schema()`
- **Logic**: Uses SQLAlchemy `inspect` to check for missing columns at startup and executes `ALTER TABLE` statements dynamically. This ensures zero-downtime updates when new feature flags are added.

### 3. Analytics Engine
- **Endpoint**: `/api/admin/analytics`
- **Logic**: Aggregates revenue by month, calculates category distribution, and identifies stock risks. Returns a structured `ai_context` object for easy interpretation of business health.

---

## 📡 API ENDPOINT MAP (CONCISE)

### Public / Customer
- `GET  /api/products`: All active products.
- `GET  /api/products/search?q={query}`: Semantic vector search.
- `GET  /api/recommendations/personalized`: AI recommendations (requires Token).
- `POST /api/customer/register`: Account creation.
- `POST /api/customer/login`: Session initiation.

### Admin (Requires `ACTIVE_ADMIN_TOKENS`)
- `GET  /api/admin/overview`: High-level metrics.
- `GET  /api/admin/analytics`: Detailed SVG graph data and AI context.
- `POST /api/products`: Create new masterpiece.
- `PUT  /api/products/<id>`: Update product flags and inventory.
- `GET  /api/admin/settings`: Manage store configuration.

---

## 📂 FILE STRUCTURE & PATHS
- **Backend Entry**: `backend/app.py`
- **Frontend Entry**: `src/main.jsx`
- **Database File**: `backend/sufi.db`
- **API Client**: `src/lib/api.js` (Handles all fetch requests and token injection).
- **Venv Path**: `.venv/` (Root directory).

---

## 📂 DETAILED FILE DIRECTORY (A TO Z)

### 1. `backend/app.py` (The Core Engine)
- **Role**: Backend Monolith.
- **Details**: Contains the entire Flask server, SQLite database models, and the AI Recommendation/Search logic.
- **Key Logic**: Handles `bcrypt` password hashing, JWT-like session token generation, and the `sentence-transformers` vector encoding. It also contains the `ensure_product_schema` function which handles automated database migrations.

### 2. `src/lib/api.js` (The Communication Bridge)
- **Role**: Central API Client.
- **Details**: Wraps the browser's `fetch` API. It handles the injection of `Authorization` tokens for both Admin and Customer sessions.
- **Critical Function**: Manages `localStorage` for session persistence and provides standardized methods (`fetchProducts`, `loginCustomer`, `fetchAdminAnalytics`) to the rest of the React app.

### 3. `src/Home.jsx` (The Storefront Orchestrator)
- **Role**: Intelligent Landing Page.
- **Details**: The primary consumer of the AI Recommendation engine.
- **Key Logic**: Dynamically filters and renders the "Featured", "Trending", "Flash Sale", and "Personalized" sections based on backend flags. Uses `Framer Motion` for premium entry animations.

### 4. `src/components/admin/AdminAnalytics.jsx` (The Insight Engine)
- **Role**: Visual Business Intelligence.
- **Details**: Uses custom-coded SVG paths and gradients to render "Sales Velocity" and "Category Traction" graphs without external charting libraries.
- **AI Utility**: Consumes the `ai_context` from the backend to provide human-readable business guidance.

### 5. `src/components/admin/ProductManager.jsx` (The Control Center)
- **Role**: Inventory & Content Management.
- **Details**: The "Source of Truth" for the homepage layout. 
- **Control Logic**: Allows admins to toggle `is_featured`, `is_trending`, and `is_on_sale` flags, which instantly updates the Homepage UI via the API.

### 6. `src/App.jsx` (The Master Router)
- **Role**: Navigation & Layout Root.
- **Details**: Manages the `react-router-dom` configuration.
- **Flow**: Controls the transitions between the "Spray Animation" welcome sequence and the main application routes.

### 7. `Run_Project.bat` (Automation Script)
- **Role**: Local DevOps.
- **Details**: A Windows batch file that orchestrates the simultaneous startup of the Vite Frontend and the Flask Backend in separate terminal windows.

---

## 🦾 AI INTERPRETATION GUIDE
- When analyzing **Business Health**: Refer to the `ai_context` in the `/api/admin/analytics` response.
- When suggesting **Inventory Updates**: Focus on the `is_featured` and `is_trending` booleans in the `Product` model to influence homepage layout.
- When generating **Promotional Copy**: Utilize the `narrative_description` field in the `Product` model for storytelling-based marketing.
