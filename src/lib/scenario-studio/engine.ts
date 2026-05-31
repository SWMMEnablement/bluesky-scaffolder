/**
 * ScenarioStudio — engine seam.
 * Real impl will parse N .out files + cost manifests and roll up KPIs.
 */

export type Scenario = {
  id: string;
  name: string;
  label: string;
  peakFlowM3s: number;
  floodVolumeMl: number;
  csoSpills: number;
  costMgbp: number;
  /** Cost per m³ of flood volume avoided vs baseline. */
  costPerM3Avoided: number | null;
  tag: "BASELINE" | "RETROFIT" | "UPSIZE" | "CLIMATE";
  status: "verified" | "active" | "draft";
  /** Hydrograph at the critical node, 24 1-hr steps. */
  hydrograph: number[];
};

export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "BASE_2024",
    name: "Baseline 2024",
    label: "BASE",
    peakFlowM3s: 38.1,
    floodVolumeMl: 14.05,
    csoSpills: 16,
    costMgbp: 0,
    costPerM3Avoided: null,
    tag: "BASELINE",
    status: "verified",
    hydrograph: [1, 2, 4, 8, 14, 22, 30, 35, 38, 36, 31, 24, 18, 13, 9, 6, 4, 3, 2, 2, 1, 1, 1, 1],
  },
  {
    id: "SUDS_A",
    name: "SUDS retrofit · zone A",
    label: "SUDS-A",
    peakFlowM3s: 31.4,
    floodVolumeMl: 9.8,
    csoSpills: 9,
    costMgbp: 12.4,
    costPerM3Avoided: 2.91,
    tag: "RETROFIT",
    status: "active",
    hydrograph: [1, 1, 3, 6, 11, 18, 24, 28, 31, 30, 26, 21, 16, 12, 9, 6, 4, 3, 2, 2, 1, 1, 1, 1],
  },
  {
    id: "UPSIZE_P099",
    name: "Pipe upsize P-099",
    label: "UPSZ",
    peakFlowM3s: 35.4,
    floodVolumeMl: 11.8,
    csoSpills: 12,
    costMgbp: 6.8,
    costPerM3Avoided: 3.02,
    tag: "UPSIZE",
    status: "active",
    hydrograph: [1, 2, 4, 7, 13, 20, 27, 32, 35, 33, 29, 23, 17, 12, 9, 6, 4, 3, 2, 2, 1, 1, 1, 1],
  },
  {
    id: "CLIMATE_2050",
    name: "Climate 2050 + SUDS",
    label: "CL-50",
    peakFlowM3s: 42.8,
    floodVolumeMl: 15.2,
    csoSpills: 14,
    costMgbp: 18.2,
    costPerM3Avoided: 14.6,
    tag: "CLIMATE",
    status: "draft",
    hydrograph: [1, 2, 5, 10, 17, 26, 34, 39, 42, 41, 37, 30, 23, 17, 12, 9, 6, 4, 3, 2, 2, 1, 1, 1],
  },
];
