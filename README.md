# Sufi Perfumes - Intelligent E-Commerce Engine

Welcome to the **Sufi Perfumes** intelligent e-commerce platform. This project has been transformed from a luxury boutique into a state-of-the-art, AI-driven marketplace with advanced analytics and dynamic personalized shopping experiences.

---

## 🚀 Key Features

### 1. AI-Powered Personalization
- **Scent Taste Profiles**: The system analyzes every customer's purchase history and calculates a unique mathematical "Taste Profile" using high-dimensional vector embeddings.
- **Personalized Recommendations**: Based on the Taste Profile, the homepage dynamically suggests perfumes that match the customer's specific scent preferences.

### 2. High-Conversion Dynamic Homepage
The storefront features several intelligently managed sections that can be controlled directly from the Admin Panel:
- **Flash Sale & Deals**: Marquee announcements and countdown-timer sections with automatic discount calculations.
- **Featured Masterpieces**: A horizontal slider for high-end "Editor's Choice" highlights.
- **Trending Now**: A social-proof grid with "Quick Add" capabilities on hover.
- **New Arrivals**: Automatic badging for the latest releases from the atelier.
- **Limited Editions**: A narrative-driven section for rare, high-exclusivity products.
- **Best Sellers**: A numbered leaderboard highlighting the most popular fragrances.

### 3. Advanced Admin Dashboard
- **Deep Analytics**: Real-time sales velocity graphs, category traction donuts, and product leaderboards.
- **Custom SVG Visualization**: Built-in glowing charts for a premium look without extra weight.
- **AI Business Guide**: A dedicated section that summarizes business health, identifies stock risks, and provides AI prompts for strategic decisions.
- **Inventory Management**: Complete control over product flags (Featured, Trending, Sale, etc.) and narrative descriptions.

### 4. Secure Authentication
- **Customer Portal**: Secure login/registration with hashed passwords and token-based sessions.
- **Admin Security**: Protected routes for all sensitive business data and management tools.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion (Animations), Lucide (Icons).
- **Backend**: Python, Flask, Flask-SQLAlchemy, SQLite.
- **AI/ML**: `sentence-transformers` (`all-mpnet-base-v2`) for high-precision scent matching.

---

## 📦 How to Run the Project

The project is designed for easy startup:

1.  **Automatic Start**: 
    Simply double-click the **`Run_Project.bat`** file in the root folder. This will automatically open two windows: one for the Flask backend and one for the Vite frontend.
    
2.  **Access Points**:
    - **Storefront**: [http://localhost:5173](http://localhost:5173)
    - **Admin Login**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
    - **API Health**: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

---

## 📈 Recent Enhancements
- **Custom Graph System**: Integrated SVG-based Area and Donut charts into the Admin Analytics.
- **Marquee Sale Bar**: Added an urgency-inducing scrolling bar for active promotions.
- **Product Flags**: Added `is_featured`, `is_trending`, `is_new_arrival`, `is_limited_edition`, `is_best_seller`, and `is_on_sale` to the database and UI.
- **Narrative Storytelling**: Added fields for creative narrative descriptions that appear in the high-impact homepage sections.

---

*This project is built to deliver a premium, boutique experience that combines traditional luxury with modern AI intelligence.*
"# ecom2" 
