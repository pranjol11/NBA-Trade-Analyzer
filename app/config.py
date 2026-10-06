from pydantic import BaseModel
import os

class Settings(BaseModel):
    env: str = os.getenv("ENV", "dev")
    discount_rate: float = float(os.getenv("DISCOUNT_RATE", 0.07))  # per year, for future picks
    next_draft_year: int = int(os.getenv("NEXT_DRAFT_YEAR", 2027))
    # 2026-27 figures (pr.nba.com); the TPE amount is indexed to the cap each season.
    salary_cap: float = float(os.getenv("SALARY_CAP", 164_961_000))
    first_apron: float = float(os.getenv("FIRST_APRON", 209_015_000))
    second_apron: float = float(os.getenv("SECOND_APRON", 221_686_000))
    expanded_tpe_amount: float = float(os.getenv("EXPANDED_TPE_AMOUNT", 9_096_000))
    roster_min: int = int(os.getenv("ROSTER_MIN", 10))
    roster_max: int = int(os.getenv("ROSTER_MAX", 15))

settings = Settings()
