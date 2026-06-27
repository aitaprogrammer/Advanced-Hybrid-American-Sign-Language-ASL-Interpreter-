import csv
from collections import Counter

# Define label names for readability
labels = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M',
    'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '0','1','2','3','4','5','6','7','8','9',' ','.'
]

# Count samples per label
counter = Counter()

with open('collected_data.csv', 'r') as f:
    reader = csv.reader(f)
    for row in reader:
        if row:  # non-empty line
            label = int(row[0])  # first column is the label index
            counter[label] += 1

# Print summary
print("\n📊 Dataset Analysis")
print("=" * 50)
print(f"Total samples: {sum(counter.values())}")
print(f"Unique labels: {len(counter)} out of 38\n")

print("Label | Name | Count")
print("-" * 30)
for i in range(38):
    name = labels[i]
    count = counter.get(i, 0)
    print(f"{i:3}   | {name:2}   | {count:4}")

# Highlight under-represented digits (less than 100 samples)
print("\n⚠️  Labels with fewer than 100 samples:")
low = [(i, labels[i], counter.get(i,0)) for i in range(38) if counter.get(i,0) < 100]
if low:
    for i, name, cnt in low:
        print(f"   Label {i} ({name}): {cnt} samples")
else:
    print("   None – all have at least 100 samples.")

if any(counter.get(i,0) < 100 for i in range(26,36)):
    print("\n💡 Recommendation: Collect more samples for digits (labels 26‑35).")