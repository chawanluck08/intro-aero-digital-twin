const TRIM_TOLERANCE = 1e-6;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

export function degreesToRadians(angleDeg) {
  assertFiniteNumber(angleDeg, "angleDeg");
  return angleDeg * DEG_TO_RAD;
}

export function radiansToDegrees(angleRad) {
  assertFiniteNumber(angleRad, "angleRad");
  return angleRad * RAD_TO_DEG;
}

// cm0: dimensionless. cmAlphaPerRad: 1/rad.
// angleOfAttackDeg: deg. Returns Cm(alpha), dimensionless.
// Positive alpha and positive Cm use the nose-up convention.
export function pitchingMomentCoefficient(
  cm0,
  cmAlphaPerRad,
  angleOfAttackDeg
) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(angleOfAttackDeg, "angleOfAttackDeg");

  const alphaRad = degreesToRadians(angleOfAttackDeg);
  return cm0 + cmAlphaPerRad * alphaRad;
}

// Returns the trim angle in radians, or null when cmAlphaPerRad is zero.
// The linear model is assumed valid at the calculated trim angle.
export function trimAngleRadians(cm0, cmAlphaPerRad) {
  assertFiniteNumber(cm0, "cm0");
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

// Returns the trim angle in degrees, or null when no unique trim angle exists.
export function trimAngleDegrees(cm0, cmAlphaPerRad) {
  const trimRad = trimAngleRadians(cm0, cmAlphaPerRad);

  if (trimRad === null) {
    return null;
  }

  return radiansToDegrees(trimRad);
}

// disturbanceAlphaDeg: deg. cmAlphaPerRad: 1/rad.
// Returns delta_Cm, dimensionless.
export function disturbanceMomentChange(
  cmAlphaPerRad,
  disturbanceAlphaDeg
) {
  assertFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  assertFiniteNumber(disturbanceAlphaDeg, "disturbanceAlphaDeg");

  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  return cmAlphaPerRad * disturbanceAlphaRad;
}

// Classifies using the specified sign of
// delta_alpha_rad * delta_Cm.
export function disturbanceTendency(
  cmAlphaPerRad,
  disturbanceAlphaDeg
) {
  const disturbanceAlphaRad = degreesToRadians(disturbanceAlphaDeg);
  const deltaCm = disturbanceMomentChange(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  const product = disturbanceAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function isTrimmed(cm) {
  assertFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}

export { TRIM_TOLERANCE };