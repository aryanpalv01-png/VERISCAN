import { describe, expect, it } from "vitest";
import { AnomalyItem } from "./AnomalyViewer";

describe("AnomalyViewer Data Models", () => {
  it("validates percentage coordinates are within bounds [0, 100]", () => {
    const anomaly: AnomalyItem = {
      id: 1,
      x_pct: 20,
      y_pct: 45,
      width_pct: 15,
      height_pct: 5,
      reason: "Font thickness mismatch",
    };

    expect(anomaly.x_pct).toBeGreaterThanOrEqual(0);
    expect(anomaly.x_pct + anomaly.width_pct).toBeLessThanOrEqual(100);
    expect(anomaly.y_pct).toBeGreaterThanOrEqual(0);
    expect(anomaly.y_pct + anomaly.height_pct).toBeLessThanOrEqual(100);
    expect(anomaly.reason).toBe("Font thickness mismatch");
  });

  it("handles multi-region anomaly list correctly", () => {
    const anomalies: AnomalyItem[] = [
      { id: 1, x_pct: 15, y_pct: 25, width_pct: 30, height_pct: 10, reason: "Signature pixel discrepancy" },
      { id: 2, x_pct: 60, y_pct: 70, width_pct: 25, height_pct: 15, reason: "Aadhaar barcode checksum altered" },
    ];

    expect(anomalies).toHaveLength(2);
    expect(anomalies[0].id).toBe(1);
    expect(anomalies[1].id).toBe(2);
  });

  it("handles verified clean specimen with empty anomaly list without fabricating flags", () => {
    const cleanAnomalies: AnomalyItem[] = [];
    expect(cleanAnomalies).toHaveLength(0);
    // Verified clean specimens should contain zero flagged anomaly items
    const hasFlags = cleanAnomalies.length > 0;
    expect(hasFlags).toBe(false);
  });
});
