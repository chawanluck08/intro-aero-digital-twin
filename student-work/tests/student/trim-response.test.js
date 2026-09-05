import { describe, expect, test } from "vitest";

import {
  pitchingMomentCoefficient,
  trimAngleRadians,
  trimAngleDegrees,
  disturbanceMomentChange,
  disturbanceTendency,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

const TOLERANCE = 1e-10;

describe("trim-response physics", () => {
  test("numerical reference case", () => {
    const cm = pitchingMomentCoefficient(0.04, -0.8, 2.86);
    const trimRad = trimAngleRadians(0.04, -0.8);
    const trimDeg = trimAngleDegrees(0.04, -0.8);
    const deltaCm = disturbanceMomentChange(-0.8, 2.0);

    expect(cm).toBeCloseTo(0.00006686672, 10);
    expect(trimRad).toBeCloseTo(0.05, 10);
    expect(trimDeg).toBeCloseTo(2.864789, 5);
    expect(deltaCm).toBeCloseTo(-0.027925268, 10);
    expect(isTrimmed(cm)).toBe(false);
    expect(disturbanceTendency(-0.8, 2.0)).toBe("restoring");
  });

  test("doubling disturbance doubles delta_Cm and preserves restoring tendency", () => {
    const deltaCm2 = disturbanceMomentChange(-0.8, 2.0);
    const deltaCm4 = disturbanceMomentChange(-0.8, 4.0);

    expect(deltaCm4).toBeCloseTo(2 * deltaCm2, TOLERANCE);
    expect(deltaCm4).toBeLessThan(0);
    expect(disturbanceTendency(-0.8, 4.0)).toBe("restoring");

    const cm2 = pitchingMomentCoefficient(0.04, -0.8, 2.86);
    const cm4 = pitchingMomentCoefficient(0.04, -0.8, 2.86);

    expect(cm4).toBeCloseTo(cm2, TOLERANCE);
    expect(trimAngleRadians(0.04, -0.8)).toBeCloseTo(
      trimAngleRadians(0.04, -0.8),
      TOLERANCE
    );
    expect(isTrimmed(cm4)).toBe(false);
  });

  test("zero-slope boundary case has no unique trim angle", () => {
    const cm = pitchingMomentCoefficient(0.04, 0, 2.86);
    const trimRad = trimAngleRadians(0.04, 0);
    const trimDeg = trimAngleDegrees(0.04, 0);
    const deltaCm = disturbanceMomentChange(0, 2.0);

    expect(cm).toBeCloseTo(0.04, TOLERANCE);
    expect(trimRad).toBeNull();
    expect(trimDeg).toBeNull();
    expect(deltaCm).toBeCloseTo(0, TOLERANCE);
    expect(isTrimmed(cm)).toBe(false);
    expect(disturbanceTendency(0, 2.0)).toBe("neutral");
  });
});