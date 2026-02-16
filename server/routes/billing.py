"""Stripe billing routes with dual test/live mode."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import stripe

from server.database import get_db
from server.models import User, Subscription
from server.config import settings
from server.routes.auth import get_current_user

router = APIRouter()
stripe.api_key = settings.STRIPE_SECRET_KEY

class CreateCheckoutSession(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str

@router.post("/create-checkout-session")
async def create_checkout_session(
    data: CreateCheckoutSession,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get or create Stripe customer
        subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
        
        if subscription and subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            customer = stripe.Customer.create(email=current_user.email, name=current_user.full_name)
            customer_id = customer.id
            
            if not subscription:
                subscription = Subscription(user_id=current_user.id, stripe_customer_id=customer_id)
                db.add(subscription)
            else:
                subscription.stripe_customer_id = customer_id
            db.commit()
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": data.price_id, "quantity": 1}],
            mode="subscription",
            success_url=data.success_url,
            cancel_url=data.cancel_url,
        )
        
        return {"sessionId": session.id, "url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # Update subscription in database
        # TODO: Implement subscription update logic
    
    return {"status": "success"}

@router.get("/subscription")
async def get_subscription(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not subscription:
        return {"tier": "free", "status": "active"}
    
    return {
        "tier": subscription.tier,
        "status": subscription.status,
        "current_period_end": subscription.current_period_end
    }
