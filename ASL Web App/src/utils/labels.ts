/**
 * ASL class labels for the 38-class model.
 * Index maps directly to the score() output array.
 * Order: A-Z (0-25), 0-9 (26-35), space (36), period (37)
 */
export const LABELS: string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', '.'
];

export const NUM_CLASSES = LABELS.length; // 38

/**
 * Get the display name for a label (space → "SPACE", period → "DOT").
 */
export function getDisplayLabel(label: string): string {
  if (label === ' ') return 'SPACE';
  if (label === '.') return 'DOT';
  return label;
}
