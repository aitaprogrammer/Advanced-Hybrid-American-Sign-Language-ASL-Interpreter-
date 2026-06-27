import cv2
import numpy as np
import csv
from cvzone.HandTrackingModule import HandDetector

detector = HandDetector(maxHands=1)
CLASSES = [chr(ord('A')+i) for i in range(26)] + [str(i) for i in range(10)] + [' ', '.']
SAVE_FILE = "collected_data.csv"

cap = cv2.VideoCapture(0)
print("=== DATA COLLECTION ===")
print("Press SPACE to capture, 'q' to quit. Change LABEL manually.\n")

LABEL = 21   # change this for each sign

while True:
    ret, frame = cap.read()
    if not ret:
        break
    frame = cv2.flip(frame, 1)
    hands, _ = detector.findHands(frame, draw=False)
    if hands:
        hand = hands[0]
        lmList = hand['lmList']  # 21 landmarks, each (x, y, z)
        # Extract only x, y (42 values)
        lm_xy = []
        for lm in lmList:
            lm_xy.append(lm[0])   # x
            lm_xy.append(lm[1])   # y
        # Normalize: subtract min x and min y
        arr = np.array(lm_xy).reshape(-1,2)
        arr[:,0] -= arr[:,0].min()
        arr[:,1] -= arr[:,1].min()
        norm = arr.flatten()
        # Draw skeleton (optional)
        detector.findHands(frame, draw=True)
    else:
        norm = None

    cv2.putText(frame, f"Label: {CLASSES[LABEL]} (index {LABEL})", (10,30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
    cv2.imshow("Collect Data", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord(' ') and norm is not None:
        with open(SAVE_FILE, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([LABEL] + norm.tolist())
        print(f"Captured for {CLASSES[LABEL]}")
    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()