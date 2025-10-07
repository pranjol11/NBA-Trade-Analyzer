from pydantic import BaseModel
import os

class Settings(BaseModel):
    env: str = os.getenv("ENV", "dev")
    alpha_now: float = float(os.getenv("GRADING_ALPHA_NOW", 1.0))
    beta_future: float = float(os.getenv("GRADING_BETA_FUTURE", 0.7))
    gamma_pick: float = float(os.getenv("GRADING_GAMMA_PICK", 0.6))
    discount_rate: float = float(os.getenv("DISCOUNT_RATE", 0.07))

settings = Settings()
