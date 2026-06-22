from __future__ import annotations

from pathlib import Path

"""Model training (EPIC-3 / Day 3).

Trains a 1X2 model (starting with logistic regression) and serializes it
to model.pkl. Stub: fill in the training-data pipeline during Day 3.
"""

MODEL_PATH = Path(__file__).parent / "model.pkl"


def train() -> None:
    raise NotImplementedError(
        "Training pipeline follows in Day 3 (EPIC-3). See app/ml/features.py."
    )


if __name__ == "__main__":
    train()
