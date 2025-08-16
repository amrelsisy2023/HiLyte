"""
Credit Service for AI usage tracking and billing
"""

from extensions import db
from models import User, AICreditTransaction
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class CreditService:
    """Service for managing AI credit transactions and balances"""
    
    def has_sufficient_credits(self, user_id: int, estimated_cost: float) -> bool:
        """Check if user has sufficient credits for operation"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            current_balance = user.get_credit_balance()
            return current_balance >= estimated_cost
        except Exception as e:
            logger.error(f"Error checking credit balance: {str(e)}")
            return False
    
    def deduct_credits(self, user_id: int, amount: float, description: str, operation: str = None, tokens_used: int = None):
        """Deduct credits from user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return None
            
            current_balance = user.get_credit_balance()
            new_balance = current_balance - amount
            
            # Create transaction record
            transaction = AICreditTransaction(
                user_id=user_id,
                type='usage',
                amount=-amount,  # Negative for usage
                balance=new_balance,
                description=description,
                metadata={
                    'operation': operation or 'usage',
                    'tokensUsed': tokens_used or 0,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            return transaction
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deducting credits: {str(e)}")
            return None