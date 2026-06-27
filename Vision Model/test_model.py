import cv2
import numpy as np
import joblib
from cvzone.HandTrackingModule import HandDetector

# Load the retrained Random Forest
model = joblib.load('app_style_model.p')

# Class labels in the same order as used in training (0-37)
labels = ['A','B','C','D','E','F','G','H','I','J','K','L','M',
          'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
          '0','1','2','3','4','5','6','7','8','9',' ','.']

# Initialize hand detector
detector = HandDetector(maxHands=1)

cap = cv2.VideoCapture(0)
print("Show a sign. Press SPACE to print prediction, ESC to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    frame = cv2.flip(frame, 1)          # mirror (same as training)
    hands, _ = detector.findHands(frame, draw=False)

    if hands:
        hand = hands[0]
        lmList = hand['lmList']         # 21 landmarks, each (x, y, z)
        # Extract only x, y (42 values)
        lm_xy = []
        for lm in lmList:
            lm_xy.append(lm[0])   # x
            lm_xy.append(lm[1])   # y
        # Normalize: subtract min x and min y (same as collect_data.py)
        arr = np.array(lm_xy).reshape(-1,2)
        arr[:,0] -= arr[:,0].min()
        arr[:,1] -= arr[:,1].min()
        norm = arr.flatten()

        # Predict
        proba = model.predict_proba([norm])[0]
        idx = np.argmax(proba)
        predicted = labels[idx]
        confidence = proba[idx]

        # Show prediction on frame
        cv2.putText(frame, f"{predicted} ({confidence:.2f})", (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0,255,0), 2)
        # Also draw landmarks for visual feedback
        detector.findHands(frame, draw=True)
    else:
        cv2.putText(frame, "No hand detected", (10, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)

    cv2.imshow('Test Model', frame)

    key = cv2.waitKey(1) & 0xFF
    if key == 27:   # ESC
        break
    if key == ord(' '):
        if hands:
            print(f"Predicted: {predicted} (confidence {confidence:.2f})")
        else:
            print("No hand detected")

cap.release()
cv2.destroyAllWindows()