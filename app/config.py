from pydantic import BaseModel
import os

class Settings(BaseModel):
    env: str = os.getenv("ENV", "dev")
    alpha_now: float = float(os.getenv("GRADING_ALPHA_NOW", 1.0))
    beta_future: float = float(os.getenv("GRADING_BETA_FUTURE", 0.7))
    gamma_pick: float = float(os.getenv("GRADING_GAMMA_PICK", 0.6))
    discount_rate: float = float(os.getenv("DISCOUNT_RATE", 0.07))
    salary_cap: float = float(os.getenv("SALARY_CAP", 154_647_000))
    roster_min: int = int(os.getenv("ROSTER_MIN", 10))
    roster_max: int = int(os.getenv("ROSTER_MAX", 15))

settings = Settings()
