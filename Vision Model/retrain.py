import csv
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

# ---------- CONFIGURATION ----------
ENABLE_MIRROR = True      # Set to False if you want right‑hand only
ENABLE_JITTER = True      # Small random noise to improve robustness
JITTER_STRENGTH = 0.02    # ±2% noise (safe for [0,1] coordinates)
# ----------------------------------

X, y = [], []

with open('collected_data.csv', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        label = int(row[0])
        vals = np.array([float(v) for v in row[1:]])   # 42 values (21 x,y)
        # Reshape to 21 points, each (x,y)
        pts = vals.reshape(21, 2)

        # ----- 1. Scale normalisation (make distance‑invariant) -----
        # The current CSV only subtracted min, but not scaled.
        # We first re‑subtract min (safe) then divide by max.
        pts[:,0] -= pts[:,0].min()
        pts[:,1] -= pts[:,1].min()
        scale = pts.max()
        if scale > 0:
            pts /= scale
        # Now coordinates are in [0,1] and scale‑invariant.

        # ----- 2. Original (right‑hand) sample -----
        X.append(pts.flatten())
        y.append(label)

        # ----- 3. Mirror augmentation (optional) -----
        if ENABLE_MIRROR:
            pts_mirror = pts.copy()
            pts_mirror[:,0] = 1.0 - pts_mirror[:,0]   # mirror x around 0.5
            X.append(pts_mirror.flatten())
            y.append(label)

        # ----- 4. Jitter augmentation (small random perturbations) -----
        if ENABLE_JITTER:
            # Create a few jittered versions of the original (and mirrored if used)
            # We'll add 2 jittered copies per original (and per mirror if mirror is on)
            for _ in range(2):
                pts_jitter = pts.copy()
                noise = np.random.normal(0, JITTER_STRENGTH, pts_jitter.shape)
                pts_jitter += noise
                # Clip to [0,1] to keep valid coordinates
                pts_jitter = np.clip(pts_jitter, 0, 1)
                X.append(pts_jitter.flatten())
                y.append(label)

            if ENABLE_MIRROR:
                for _ in range(2):
                    pts_jitter_mirror = pts_mirror.copy()
                    noise = np.random.normal(0, JITTER_STRENGTH, pts_jitter_mirror.shape)
                    pts_jitter_mirror += noise
                    pts_jitter_mirror = np.clip(pts_jitter_mirror, 0, 1)
                    X.append(pts_jitter_mirror.flatten())
                    y.append(label)

# Convert to numpy arrays
X = np.array(X)
y = np.array(y)

print(f"Total samples after augmentation: {len(X)}")
print(f"Unique classes: {len(set(y))}")

# Train Random Forest
clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
clf.fit(X, y)

# Cross‑validation (use a small subset because dataset is large)
# Use 3‑fold for speed; you can increase to 5 if time allows.
scores = cross_val_score(clf, X, y, cv=3, n_jobs=-1)
print(f"Cross-validation accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")

# Save model
joblib.dump(clf, 'app_style_model_scaled.p')
print("Model saved as app_style_model_scaled.p")