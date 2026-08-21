import { BedViolation } from '@/types';

export interface ParsedInspection {
  date: string | null;
  violations: BedViolation[];
}

export function parseInspectionText(text: string): ParsedInspection {
  const lines = text.split('\n');
  let date: string | null = null;
  const violations: BedViolation[] = [];

  const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
  const bedRegex = /เตียงที่\s+([\d\s]+)(.*)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for date in header
    if (trimmed.includes('ผลการตรวจโรงนอน')) {
      const dateMatch = trimmed.match(dateRegex);
      if (dateMatch) {
        date = dateMatch[1];
      }
      continue;
    }

    // Check for bed violations
    const bedMatch = trimmed.match(bedRegex);
    if (bedMatch) {
      const numbersPart = bedMatch[1].trim();
      const remark = bedMatch[2].trim();

      // Split numbers by space. Support multiple spaces between numbers.
      const bedNumbers = numbersPart.split(/\s+/).filter(Boolean);

      for (const bedNo of bedNumbers) {
        violations.push({
          bedNo,
          remark,
        });
      }
    }
  }

  return { date, violations };
}
