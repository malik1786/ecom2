import sys
import os
import json

# Ensure we can import app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app, db, Order

with app.app_context():
    # 1. Get the first order from the database
    order = Order.query.first()
    if not order:
        print("No orders found in the database. Creating a dummy order for testing...")
        from app import Customer
        customer = Customer.query.first()
        if not customer:
            customer = Customer(full_name="Test User", email="test@test.com")
            db.session.add(customer)
            db.session.commit()
            
        order = Order(
            order_number="SF-TEST-001",
            customer_id=customer.id,
            status="new",
            payment_status="pending",
            total_cents=1000
        )
        db.session.add(order)
        db.session.commit()
        
    order_number = order.order_number
    print(f"--- BEFORE WEBHOOK ---")
    print(f"Order Number: {order_number}")
    print(f"Payment Status: {order.payment_status}")
    print(f"Order Status: {order.status}")
    print(f"----------------------\n")
    
    # 2. Simulate the webhook using Flask test client
    print("Simulating Stripe Webhook POST request...")
    client = app.test_client()
    payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": order_number,
                "id": "cs_test_abc123"
            }
        }
    }
    
    response = client.post(
        '/api/webhooks/stripe',
        data=json.dumps(payload),
        content_type='application/json'
    )
    
    print(f"Webhook HTTP Status Code: {response.status_code}")
    print(f"Webhook Response Body: {response.data.decode('utf-8')}\n")
    
    # 3. Check database to see if it updated
    updated_order = db.session.get(Order, order.id)
    print(f"--- AFTER WEBHOOK ---")
    print(f"Payment Status: {updated_order.payment_status}")
    print(f"Order Status: {updated_order.status}")
    print(f"Payment Details (Contains Session ID): {updated_order.payment_details}")
    print(f"---------------------")
    
    # Reset it back to pending so we don't mess up your real DB
    updated_order.payment_status = "pending"
    updated_order.status = "new"
    db.session.commit()
    print("\n(Reset order back to pending for your next tests)")
