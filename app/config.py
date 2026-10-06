from pydantic import BaseModel
import os

class Settings(BaseModel):
    env: str = os.getenv("ENV", "dev")
    alpha_now: float = float(os.getenv("GRADING_ALPHA_NOW", 1.0))
    beta_future: float = float(os.getenv("GRADING_BETA_FUTURE", 0.7))
    gamma_pick: float = float(os.getenv("GRADING_GAMMA_PICK", 0.6))
    discount_rate: float = float(os.getenv("DISCOUNT_RATE", 0.07))
    # 2026-27 figures (pr.nba.com); the TPE amount is indexed to the cap each season.
    salary_cap: float = float(os.getenv("SALARY_CAP", 164_961_000))
    first_apron: float = float(os.getenv("FIRST_APRON", 209_015_000))
    second_apron: float = float(os.getenv("SECOND_APRON", 221_686_000))
    expanded_tpe_amount: float = float(os.getenv("EXPANDED_TPE_AMOUNT", 9_096_000))
    roster_min: int = int(os.getenv("ROSTER_MIN", 10))
    roster_max: int = int(os.getenv("ROSTER_MAX", 15))

settings = Settings()
