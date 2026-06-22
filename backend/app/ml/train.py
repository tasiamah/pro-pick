from __future__ import annotations

from pathlib import Path

"""Modeltraining (EPIC-3 / Dag 3).

Traint een 1X2-model (start met logistische regressie) en serialiseert het
naar model.pkl. Stub: vul de trainingsdata-pijplijn in tijdens Dag 3.
"""

MODEL_PATH = Path(__file__).parent / "model.pkl"


def train() -> None:
    raise NotImplementedError(
        "Trainings-pipeline volgt in Dag 3 (EPIC-3). Zie app/ml/features.py."
    )


if __name__ == "__main__":
    train()
