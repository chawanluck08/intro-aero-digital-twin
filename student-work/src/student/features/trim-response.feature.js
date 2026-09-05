import {
  pitchingMomentCoefficient,
  trimAngleDegrees,
  trimAngleRadians,
  disturbanceMomentChange,
  disturbanceTendency,
  isTrimmed,
} from "../physics/trim-response.js";

const NUMERICAL_TOLERANCE = 1e-10;

function approximatelyEqual(actual, expected, tolerance = NUMERICAL_TOLERANCE) {
  return Math.abs(actual - expected) <= tolerance;
}

function finiteAircraftValue(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function analyzeInputs(aircraft) {
  finiteAircraftValue(aircraft.cm0, "cm0");
  finiteAircraftValue(aircraft.cmAlphaPerRad, "cmAlphaPerRad");
  finiteAircraftValue(
    aircraft.angleOfAttackDeg,
    "angleOfAttackDeg"
  );
  finiteAircraftValue(
    aircraft.disturbanceAlphaDeg,
    "disturbanceAlphaDeg"
  );

  const cm = pitchingMomentCoefficient(
    aircraft.cm0,
    aircraft.cmAlphaPerRad,
    aircraft.angleOfAttackDeg
  );

  const trimRad = trimAngleRadians(
    aircraft.cm0,
    aircraft.cmAlphaPerRad
  );

  const trimDeg = trimAngleDegrees(
    aircraft.cm0,
    aircraft.cmAlphaPerRad
  );

  const deltaCm = disturbanceMomentChange(
    aircraft.cmAlphaPerRad,
    aircraft.disturbanceAlphaDeg
  );

  const tendency = disturbanceTendency(
    aircraft.cmAlphaPerRad,
    aircraft.disturbanceAlphaDeg
  );

  return {
    cm,
    trimRad,
    trimDeg,
    deltaCm,
    tendency,
    trimmed: isTrimmed(cm),
  };
}

const numericalCase = {
  inputs: {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  },
  expected: {
    cm: 0.00006686672,
    trimRad: 0.05,
    deltaCm: -0.027925268,
    trimmed: false,
    tendency: "restoring",
  },
};

const behavioralCase = {
  inputs: {
    cm0: 0.04,
    cmAlphaPerRad: -0.8,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 4.0,
  },
  expected: {
    cm: 0.00006686672,
    trimRad: 0.05,
    deltaCm: -0.05585056,
    trimmed: false,
    tendency: "restoring",
  },
};

const boundaryCase = {
  inputs: {
    cm0: 0.04,
    cmAlphaPerRad: 0,
    angleOfAttackDeg: 2.86,
    disturbanceAlphaDeg: 2.0,
  },
  expected: {
    cm: 0.04,
    trimRad: null,
    deltaCm: 0,
    trimmed: false,
    tendency: "neutral",
  },
};

function verifyNumericalCase() {
  const actual = analyzeInputs(numericalCase.inputs);

  return {
    name: "Numerical reference case",
    passed:
      approximatelyEqual(actual.cm, numericalCase.expected.cm) &&
      approximatelyEqual(actual.trimRad, numericalCase.expected.trimRad) &&
      approximatelyEqual(
        actual.deltaCm,
        numericalCase.expected.deltaCm
      ) &&
      actual.trimmed === numericalCase.expected.trimmed &&
      actual.tendency === numericalCase.expected.tendency,
  };
}

function verifyBehavioralCase() {
  const actual = analyzeInputs(behavioralCase.inputs);

  const reference = analyzeInputs(numericalCase.inputs);

  return {
    name: "Behavioral doubled-disturbance case",
    passed:
      approximatelyEqual(actual.cm, behavioralCase.expected.cm) &&
      approximatelyEqual(actual.trimRad, behavioralCase.expected.trimRad) &&
      approximatelyEqual(
        actual.deltaCm,
        behavioralCase.expected.deltaCm
      ) &&
      actual.trimmed === behavioralCase.expected.trimmed &&
      actual.tendency === behavioralCase.expected.tendency &&
      actual.deltaCm < 0 &&
      approximatelyEqual(
        Math.abs(actual.deltaCm),
        2 * Math.abs(reference.deltaCm)
      ),
  };
}

function verifyBoundaryCase() {
  const actual = analyzeInputs(boundaryCase.inputs);

  return {
    name: "Zero-slope boundary case",
    passed:
      approximatelyEqual(actual.cm, boundaryCase.expected.cm) &&
      actual.trimRad === boundaryCase.expected.trimRad &&
      approximatelyEqual(
        actual.deltaCm,
        boundaryCase.expected.deltaCm
      ) &&
      actual.trimmed === boundaryCase.expected.trimmed &&
      actual.tendency === boundaryCase.expected.tendency,
  };
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Determines trim status and small-disturbance pitching-moment tendency using the linear Cm–alpha model.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    { id: "loads.pitch.component-sum", version: 1 },
  ],
  providesCapabilities: [
    { id: "stability.pitch.cm-alpha", version: 1 },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    const capabilities = capabilityContext?.capabilities ?? capabilityContext ?? {};

    const requiredCapability =
      capabilities["loads.pitch.component-sum"];

    if (!requiredCapability) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required loads.pitch.component-sum capability is not available, so the Stage 4 analysis remains locked.",
          status: "caution",
        },
        plots: [],
        scene: null,
      };
    }

    const analysis = analyzeInputs(aircraft);

    const verificationCases = [
      verifyNumericalCase(),
      verifyBehavioralCase(),
      verifyBoundaryCase(),
    ];

    const plotPoints = [];
    for (let angleDeg = -10; angleDeg <= 10; angleDeg += 1) {
      plotPoints.push({
        x: angleDeg,
        y: pitchingMomentCoefficient(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          angleDeg
        ),
      });
    }

    if (
      !plotPoints.some(
        (point) =>
          approximatelyEqual(point.x, aircraft.angleOfAttackDeg) ||
          point.x === aircraft.angleOfAttackDeg
      )
    ) {
      plotPoints.push({
        x: aircraft.angleOfAttackDeg,
        y: pitchingMomentCoefficient(
          aircraft.cm0,
          aircraft.cmAlphaPerRad,
          aircraft.angleOfAttackDeg
        ),
      });
      plotPoints.sort((a, b) => a.x - b.x);
    }

    let interpretation;

    if (analysis.trimmed) {
      interpretation =
        "The selected condition is trimmed within the specified Cm tolerance. The disturbance tendency is classified only by the specified quasi-static model.";
    } else {
      interpretation =
        "The selected condition is not trimmed within the specified Cm tolerance. The disturbance tendency is classified only by the specified quasi-static model.";
    }

    return {
      results: [
        {
          id: "pitching-moment-coefficient",
          label: "Cm(alpha)",
          value: analysis.cm,
          unit: "",
          precision: 8,
          emphasis: true,
        },
        {
          id: "trim-angle",
          label: "Trim angle",
          value: analysis.trimDeg ?? "not available",
          unit: analysis.trimDeg === null ? "" : "deg",
          precision: 6,
        },
        {
          id: "disturbance-moment-change",
          label: "delta_Cm",
          value: analysis.deltaCm,
          unit: "",
          precision: 8,
        },
        {
          id: "trim-status",
          label: "Selected condition trimmed",
          value: analysis.trimmed ? "trimmed" : "not trimmed",
          unit: "",
          precision: 0,
        },
        {
          id: "disturbance-tendency",
          label: "Disturbance tendency",
          value: analysis.tendency,
          unit: "",
          precision: 0,
        },
      ],
      verificationCases,
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation,
        status: analysis.trimmed ? "pass" : "caution",
      },
      plots: [
        {
          id: "cm-alpha",
          title: "Cm–alpha relationship",
          xAxis: {
            label: "Angle of attack",
            unit: "deg",
          },
          yAxis: {
            label: "Pitching-moment coefficient",
            unit: "",
          },
          series: [
            {
              id: "cm-alpha-series",
              label: "Cm(alpha)",
              points: plotPoints,
            },
          ],
          regions: [],
          referenceLines: [
            {
              id: "trim-line",
              label: "Cm = 0",
              y: 0,
            },
          ],
        },
      ],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft ?? {};
    const capabilities = runtimeContext?.capabilities ?? {};

    const requiredCapability =
      capabilities["loads.pitch.component-sum"];

    if (!requiredCapability) {
      return {
        values: {},
      };
    }

    const analysis = analyzeInputs(aircraft);

    return {
      values: {
        cm: analysis.cm,
        trimAngleDeg: analysis.trimDeg,
        deltaCm: analysis.deltaCm,
      },
    };
  },
};