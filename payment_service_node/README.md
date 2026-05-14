# Node.js Payment Service

A robust, production-ready payment microservice using Node.js, Express, and MongoDB. It implements **Razorpay** as the primary gateway and **PayU** as an automatic fallback, complete with webhook handling, signature verification, idempotency, and retry logic.

## 🧱 Architecture

- **/models**: Mongoose schemas (`Order`, `PaymentLog`).
- **/services**: Abstraction layer for Razorpay, PayU, and the failover manager (`paymentService`).
- **/controllers**: Express route handlers.
- **/utils**: Cryptography functions for HMAC validation.
- **/cron**: Background jobs for pending payment reconciliation.

## 🚀 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Rename or modify the `.env` file to include your database and gateway credentials.
   ```
   MONGO_URI=mongodb://localhost:27017/payments_db
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
   PAYU_MERCHANT_KEY=your_payu_merchant_key
   PAYU_SALT=your_payu_salt
   ```

3. **Run the Server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔌 API Endpoints

- **POST /api/payment/order/create**
  Create an internal order before initiating payment.
  *Body: `{ "user_id": "123", "amount": 500, "currency": "INR" }`*

- **POST /api/payment/start**
  Initiate a payment. Automatically tries Razorpay first, falls back to PayU if it fails.
  *Body: `{ "order_id": "ORDER_...", "customerDetails": { "name": "...", "email": "..." } }`*

- **POST /api/payment/verify**
  Manually verify a payment signature from the client-side.
  *Body: `{ "payload": { ... }, "gateway": "RAZORPAY" }`*

- **POST /api/payment/webhook/razorpay**
  Secure endpoint for Razorpay webhooks (`payment.captured` event).

## 🐳 Docker Deployment

```bash
docker build -t payment-service .
docker run -p 3000:3000 --env-file .env payment-service
```
