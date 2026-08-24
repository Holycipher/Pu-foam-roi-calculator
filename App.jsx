import React, { useState, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, ReferenceLine,
} from 'recharts';
import { AlertTriangle, CheckCircle2, ChevronDown, RotateCcw, Download } from 'lucide-react';

/* ============================== constants ============================== */

const PIE_COLORS = ['#1F6F5C', '#4C7A9C', '#C67A2E', '#8C6E4A', '#9AA0A6'];

const DEFAULTS = {
  ultimaExWorks: 52500000,
  gstPercent: 18,
  installationLabour: 810000,
  commissioningExpert: 175000,
  freightInsurance: 500000,
  infrastructureCost: 5000000,

  polyolCostPerKg: 120,
  tdiCostPerKg: 200,
  additivesPct: 10,
  polyolMixPct: 55,
  yieldPct: 90,
  machineThroughputKgPerMin: 350,
  operatingHoursPerDay: 16,
  operatingDaysPerYear: 300,
  utilizationPct: 60,

  operatorsCount: 4,
  operatorWage: 25000,
  helpersCount: 6,
  helperWage: 15000,
  supervisorsCount: 1,
  supervisorWage: 40000,
  qcCount: 1,
  qcWage: 30000,

  machinePowerHp: 200,
  loadFactorPct: 70,
  electricityTariff: 8,
  annualMaintenancePct: 3,

  spaceRequiredSqm: 400,
  spaceArrangement: 'Lease',
  rentPerSqmPerMonth: 150,

  pipelineNorth: 53000000,
  pipelineWest: 271500000,
  pipelineSouthTotal: 90000000,
  pipelineSouthMattress: 48000000,
  includeMattressLine: false,
  pipelineEast: 0,
  blendedPrice: 325,
  rampY1: 40,
  rampY2: 75,
  rampY3: 100,
  horizonYears: 7,

  discountRatePct: 13,
  taxRatePct: 25,
  gstCreditRecoverable: true,
};

const PLACEHOLDER_KEYS = [
  'freightInsurance', 'infrastructureCost', 'polyolCostPerKg', 'tdiCostPerKg',
  'additivesPct', 'polyolMixPct', 'yieldPct', 'operatingHoursPerDay',
  'operatingDaysPerYear', 'utilizationPct', 'operatorsCount', 'operatorWage',
  'helpersCount', 'helperWage', 'supervisorsCount', 'supervisorWage',
  'qcCount', 'qcWage', 'loadFactorPct', 'electricityTariff',
  'annualMaintenancePct', 'rentPerSqmPerMonth', 'rampY1', 'rampY2',
  'discountRatePct', 'taxRatePct',
];

const SCENARIO_DELTAS = {
  Base: { material: 0, ramp: 0 },
  Best: { material: -10, ramp: 15 },
  Worst: { material: 15, ramp: -15 },
};

const SECTIONS = [
  { id: 'capital', num: '01', title: 'Machine & capital cost', blurb: 'What it costs to buy, land, and install the machine.' },
  { id: 'material', num: '02', title: 'Raw material, yield & capacity', blurb: 'What foam costs to make, and how much the machine can produce.' },
  { id: 'manpower', num: '03', title: 'Manpower', blurb: 'The team needed to run the line.' },
  { id: 'utilities', num: '04', title: 'Electricity & maintenance', blurb: 'Running costs for power and upkeep.' },
  { id: 'space', num: '05', title: 'Space', blurb: 'Shop-floor footprint and rent.' },
  { id: 'revenue', num: '06', title: 'Revenue pipeline & ramp-up', blurb: 'Business already lined up, and how fast it scales in.' },
  { id: 'finance', num: '07', title: 'Financing & tax', blurb: 'The hurdle rate and tax assumptions used to judge the return.' },
];

const FIELDS = [
  { key: 'ultimaExWorks', section: 'capital', label: 'Machine price (ex-works)', help: 'Vendor quote for the machine itself.', unit: '₹', type: 'money', real: true },
  { key: 'gstPercent', section: 'capital', label: 'GST on the machine', unit: '%', type: 'percent', min: 0, max: 30, step: 1, real: true },
  { key: 'installationLabour', section: 'capital', label: 'Installation labour', unit: '₹', type: 'money', real: true },
  { key: 'commissioningExpert', section: 'capital', label: 'Commissioning expert fee', unit: '₹', type: 'money', real: true },
  { key: 'freightInsurance', section: 'capital', label: 'Freight & insurance', help: 'Not yet quoted — this is a placeholder.', unit: '₹', type: 'money', real: false },
  { key: 'infrastructureCost', section: 'capital', label: 'Infrastructure (civil, chiller, compressor, electrical)', help: 'Site-prep costs, none quoted yet.', unit: '₹', type: 'money', real: false },

  { key: 'polyolCostPerKg', section: 'material', label: 'Polyol cost', unit: '₹/kg', type: 'money', step: 5, real: false },
  { key: 'tdiCostPerKg', section: 'material', label: 'TDI cost', unit: '₹/kg', type: 'money', step: 5, real: false },
  { key: 'additivesPct', section: 'material', label: 'Additives (catalyst, colour, blowing agent)', help: 'Extra cost on top of polyol + TDI.', unit: '%', type: 'percent', min: 0, max: 30, step: 1, real: false },
  { key: 'polyolMixPct', section: 'material', label: 'Polyol share of the formulation', help: 'The rest is assumed to be TDI.', unit: '%', type: 'percent', min: 0, max: 100, step: 1, real: false },
  { key: 'yieldPct', section: 'material', label: 'Finished-foam yield', help: 'Share of raw material that becomes sellable foam.', unit: '%', type: 'percent', min: 50, max: 100, step: 1, real: false },
  { key: 'machineThroughputKgPerMin', section: 'material', label: 'Machine throughput', unit: 'kg/min', type: 'number', min: 0, real: true },
  { key: 'operatingHoursPerDay', section: 'material', label: 'Operating hours per day', unit: 'hrs', type: 'number', min: 1, max: 24, step: 1, real: false },
  { key: 'operatingDaysPerYear', section: 'material', label: 'Operating days per year', unit: 'days', type: 'number', min: 1, max: 365, step: 1, real: false },
  { key: 'utilizationPct', section: 'material', label: 'Capacity utilisation', help: "What share of the machine's rated capacity you plan to actually run.", unit: '%', type: 'percent', min: 0, max: 100, step: 1, real: false },

  { key: 'operatorsCount', section: 'manpower', label: 'Operators', unit: 'people', type: 'count', min: 0, real: false },
  { key: 'operatorWage', section: 'manpower', label: 'Operator monthly wage', unit: '₹/month', type: 'money', real: false },
  { key: 'helpersCount', section: 'manpower', label: 'Helpers', unit: 'people', type: 'count', min: 0, real: false },
  { key: 'helperWage', section: 'manpower', label: 'Helper monthly wage', unit: '₹/month', type: 'money', real: false },
  { key: 'supervisorsCount', section: 'manpower', label: 'Supervisors', unit: 'people', type: 'count', min: 0, real: false },
  { key: 'supervisorWage', section: 'manpower', label: 'Supervisor monthly wage', unit: '₹/month', type: 'money', real: false },
  { key: 'qcCount', section: 'manpower', label: 'QC staff', unit: 'people', type: 'count', min: 0, real: false },
  { key: 'qcWage', section: 'manpower', label: 'QC monthly wage', unit: '₹/month', type: 'money', real: false },

  { key: 'machinePowerHp', section: 'utilities', label: 'Machine power rating', unit: 'HP', type: 'number', min: 0, real: true },
  { key: 'loadFactorPct', section: 'utilities', label: 'Average load factor', help: 'The motor rarely runs at 100% of rated load continuously.', unit: '%', type: 'percent', min: 0, max: 100, step: 1, real: false },
  { key: 'electricityTariff', section: 'utilities', label: 'Electricity tariff', unit: '₹/unit', type: 'money', step: 0.5, real: false },
  { key: 'annualMaintenancePct', section: 'utilities', label: 'Annual maintenance', help: 'As a % of the landed machine cost.', unit: '%', type: 'percent', min: 0, max: 15, step: 0.5, real: false },

  { key: 'spaceRequiredSqm', section: 'space', label: 'Floor space required', unit: 'sqm', type: 'number', min: 0, real: true },
  { key: 'spaceArrangement', section: 'space', label: 'Space arrangement', type: 'select', options: ['Lease', 'Own'], real: true },
  { key: 'rentPerSqmPerMonth', section: 'space', label: 'Rent', unit: '₹/sqm/month', type: 'money', step: 5, real: false },

  { key: 'pipelineNorth', section: 'revenue', label: 'North Zone pipeline', unit: '₹', type: 'money', real: true },
  { key: 'pipelineWest', section: 'revenue', label: 'West Zone pipeline', unit: '₹', type: 'money', real: true },
  { key: 'pipelineSouthTotal', section: 'revenue', label: 'South Zone pipeline (total)', unit: '₹', type: 'money', real: true },
  { key: 'pipelineSouthMattress', section: 'revenue', label: '— of which, mattress / car-seat / furniture', unit: '₹', type: 'money', real: true },
  { key: 'includeMattressLine', section: 'revenue', label: 'Include the mattress line in the pipeline', type: 'boolean', real: true },
  { key: 'pipelineEast', section: 'revenue', label: 'East Zone pipeline', help: 'Pending — leave at 0 rather than estimate it.', unit: '₹', type: 'money', real: true },
  { key: 'blendedPrice', section: 'revenue', label: 'Blended selling price', help: 'Simple average of your North/West per-kg quotes.', unit: '₹/kg', type: 'money', step: 5, real: true },
  { key: 'rampY1', section: 'revenue', label: 'Year 1 ramp-up', unit: '%', type: 'percent', min: 0, max: 100, step: 5, real: false },
  { key: 'rampY2', section: 'revenue', label: 'Year 2 ramp-up', unit: '%', type: 'percent', min: 0, max: 100, step: 5, real: false },
  { key: 'rampY3', section: 'revenue', label: 'Year 3-onward ramp-up', unit: '%', type: 'percent', min: 0, max: 100, step: 5, real: true },
  { key: 'horizonYears', section: 'revenue', label: 'Years to analyse', unit: 'years', type: 'number', min: 3, max: 15, step: 1, real: true },

  { key: 'discountRatePct', section: 'finance', label: 'Discount rate (hurdle rate)', help: "The minimum return Supreme expects — used to discount future cash to today's value.", unit: '%', type: 'percent', min: 0, max: 30, step: 0.5, real: false },
  { key: 'taxRatePct', section: 'finance', label: 'Tax rate', unit: '%', type: 'percent', min: 0, max: 40, step: 1, real: false },
  { key: 'gstCreditRecoverable', section: 'finance', label: 'GST on the machine is recoverable as input credit', help: "Informational only for now — doesn't change the numbers below.", type: 'boolean', real: true },
];

/* ============================== helpers ============================== */

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function formatINRCompact(x) {
  const sign = x < 0 ? '-' : '';
  const abs = Math.abs(x);
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

function formatAxisCr(x) { return `₹${x.toFixed(0)} Cr`; }

function formatFieldValue(field, value) {
  if (field.type === 'boolean') return value ? 'Yes' : 'No';
  if (field.type === 'select') return value;
  if (field.type === 'money') return formatINRCompact(value);
  if (field.type === 'percent') return `${value}%`;
  return `${value}${field.unit ? ' ' + field.unit : ''}`;
}

/* ===================== calculation engine (mirrors the Colab notebook) ===================== */

function computeModel(inp, scenario, mult = {}) {
  const { priceMult = 1, materialMult = 1, rampMult = 1, elecMult = 1, manpowerMult = 1 } = mult;
  const delta = SCENARIO_DELTAS[scenario] || SCENARIO_DELTAS.Base;

  const machineLanded = inp.ultimaExWorks * (1 + inp.gstPercent / 100) + inp.installationLabour + inp.commissioningExpert;
  const totalCapex = machineLanded + inp.freightInsurance + inp.infrastructureCost;

  const south = inp.includeMattressLine ? inp.pipelineSouthTotal : (inp.pipelineSouthTotal - inp.pipelineSouthMattress);
  const totalPipeline = inp.pipelineNorth + inp.pipelineWest + south + inp.pipelineEast;

  const theoreticalMaxKgYear = inp.machineThroughputKgPerMin * 60 * inp.operatingHoursPerDay * inp.operatingDaysPerYear;
  const pricePerKg = inp.blendedPrice * priceMult;
  const impliedVolumeKg = pricePerKg ? totalPipeline / pricePerKg : 0;
  const capacityUtilizationPct = theoreticalMaxKgYear ? clamp(100 * impliedVolumeKg / theoreticalMaxKgYear, 0, 999) : 0;

  const polyolFrac = inp.polyolMixPct / 100;
  const baseCost = polyolFrac * inp.polyolCostPerKg + (1 - polyolFrac) * inp.tdiCostPerKg;
  const materialCostPerKgInput = baseCost * (1 + inp.additivesPct / 100) * (1 + delta.material / 100) * materialMult;
  const materialCostPerKgFinished = inp.yieldPct ? materialCostPerKgInput / (inp.yieldPct / 100) : 0;

  const manpowerAnnual = 12 * (
    inp.operatorsCount * inp.operatorWage + inp.helpersCount * inp.helperWage +
    inp.supervisorsCount * inp.supervisorWage + inp.qcCount * inp.qcWage
  ) * manpowerMult;
  const kwRating = inp.machinePowerHp * 0.746;
  const annualUnits = kwRating * (inp.loadFactorPct / 100) * inp.operatingHoursPerDay * inp.operatingDaysPerYear;
  const electricityAnnual = annualUnits * inp.electricityTariff * elecMult;
  const rentAnnual = inp.spaceArrangement === 'Lease' ? inp.rentPerSqmPerMonth * inp.spaceRequiredSqm * 12 : 0;
  const maintenanceAnnual = machineLanded * (inp.annualMaintenancePct / 100);
  const fixedCosts = manpowerAnnual + electricityAnnual + rentAnnual + maintenanceAnnual;

  const horizon = Math.max(1, Math.round(inp.horizonYears));
  const ramps = [];
  for (let yr = 1; yr <= horizon; yr++) {
    const base = yr === 1 ? inp.rampY1 : yr === 2 ? inp.rampY2 : inp.rampY3;
    ramps.push(clamp(base * rampMult + delta.ramp, 0, 100) / 100);
  }

  const cashFlows = [-totalCapex];
  ramps.forEach((ramp) => {
    const rev = totalPipeline * ramp;
    const volKg = pricePerKg ? rev / pricePerKg : 0;
    const matCost = volKg * materialCostPerKgFinished;
    const opex = matCost + fixedCosts;
    const margin = rev - opex;
    const tax = Math.max(0, margin) * (inp.taxRatePct / 100);
    cashFlows.push(margin - tax);
  });

  const r = inp.discountRatePct / 100;
  const npv = cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);

  const npvAt = (rate) => cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
  let lo = -0.99, hi = 5.0, irr = null;
  if (npvAt(lo) * npvAt(hi) < 0) {
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (npvAt(lo) * npvAt(mid) <= 0) hi = mid; else lo = mid;
    }
    irr = (lo + hi) / 2;
  }

  let cum = 0, paybackYear = null;
  cashFlows.forEach((cf, t) => {
    cum += cf;
    if (t > 0 && cum >= 0 && paybackYear === null) paybackYear = t;
  });

  return {
    totalCapex, totalPipeline, theoreticalMaxKgYear, capacityUtilizationPct,
    materialCostPerKgFinished, fixedCosts, cashFlows, npv, irr, paybackYear,
    pricePerKg, machineLanded, horizon,
  };
}

/* ============================== small UI pieces ============================== */

function LinearGauge({ label, sub, format, value, min, max, crossValue, goodDirection, neutral }) {
  const v = value === null || value === undefined || Number.isNaN(value) ? min : value;
  const range = (max - min) || 1;
  const pct = clamp(((clamp(v, min, max)) - min) / range * 100, 0, 100);
  let background;
  if (neutral) {
    background = 'linear-gradient(to right, #274A63, #5C88A8)';
  } else {
    const crossPct = clamp(((crossValue - min) / range) * 100, 0, 100);
    background = goodDirection === 'high'
      ? `linear-gradient(to right, #B23A2E 0%, #B23A2E ${crossPct}%, #1F6F5C ${Math.min(crossPct + 2, 100)}%, #1F6F5C 100%)`
      : `linear-gradient(to right, #1F6F5C 0%, #1F6F5C ${Math.max(crossPct - 2, 0)}%, #B23A2E ${crossPct}%, #B23A2E 100%)`;
  }
  return (
    <div className="roi-gauge">
      <div className="roi-gauge__top">
        <span className="roi-gauge__value">{format}</span>
        <span className="roi-gauge__label">{label}</span>
      </div>
      <div className="roi-gauge__track" style={{ background }}>
        <div className="roi-gauge__marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="roi-gauge__sub">{sub}</div>
    </div>
  );
}

function FieldControl({ field, value, onChange }) {
  if (field.type === 'boolean') {
    return (
      <div className="roi-field roi-field--bool">
        <div className="roi-field__labelrow">
          <span className={`roi-dot ${field.real ? 'is-real' : 'is-estimate'}`} />
          <span className="roi-field__label">{field.label}</span>
        </div>
        <button type="button" className={`roi-toggle ${value ? 'is-on' : ''}`} onClick={() => onChange(!value)} aria-pressed={value}>
          <span className="roi-toggle__thumb" />
        </button>
        {field.help && <p className="roi-field__help">{field.help}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="roi-field">
        <div className="roi-field__labelrow">
          <span className={`roi-dot ${field.real ? 'is-real' : 'is-estimate'}`} />
          <span className="roi-field__label">{field.label}</span>
        </div>
        <div className="roi-segmented">
          {field.options.map((opt) => (
            <button key={opt} type="button" className={`roi-segmented__opt ${value === opt ? 'is-active' : ''}`} onClick={() => onChange(opt)}>
              {opt}
            </button>
          ))}
        </div>
        {field.help && <p className="roi-field__help">{field.help}</p>}
      </div>
    );
  }

  const isMoney = field.type === 'money';
  const isPercent = field.type === 'percent';

  return (
    <div className="roi-field">
      <div className="roi-field__labelrow">
        <span className={`roi-dot ${field.real ? 'is-real' : 'is-estimate'}`} />
        <span className="roi-field__label">{field.label}</span>
        {field.unit && <span className="roi-field__unit">{field.unit}</span>}
      </div>
      <div className="roi-field__inputrow">
        <input
          type="number"
          className="roi-input"
          value={value}
          min={field.min}
          max={field.max}
          step={field.step || (isMoney ? 1000 : 1)}
          onChange={(e) => {
            const raw = e.target.value;
            const n = Number(raw);
            onChange(raw === '' || Number.isNaN(n) ? 0 : n);
          }}
        />
        {isPercent && (
          <input
            type="range"
            className="roi-slider"
            value={value}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step || 1}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        )}
      </div>
      {isMoney && <p className="roi-field__hint">≈ {formatINRCompact(value)}</p>}
      {field.help && <p className="roi-field__help">{field.help}</p>}
    </div>
  );
}

function Section({ section, values, onChange, open, onToggle }) {
  const sectionFields = FIELDS.filter((f) => f.section === section.id);
  const toReview = sectionFields.filter((f) => PLACEHOLDER_KEYS.includes(f.key) && values[f.key] === DEFAULTS[f.key]).length;
  return (
    <section className="roi-section">
      <button type="button" className="roi-section__header" onClick={onToggle}>
        <span className="roi-section__num">{section.num}</span>
        <span className="roi-section__titlewrap">
          <span className="roi-section__title">{section.title}</span>
          <span className="roi-section__blurb">{section.blurb}</span>
        </span>
        {toReview > 0 && <span className="roi-badge">{toReview} to review</span>}
        <ChevronDown size={18} className={`roi-chev ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <div className="roi-section__body">
          {sectionFields.map((f) => (
            <FieldControl key={f.key} field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
          ))}
        </div>
      )}
    </section>
  );
}

function SensTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="roi-tip">
      <strong>{d.name}</strong>
      <div>₹{d.low.toFixed(1)} Cr to ₹{d.high.toFixed(1)} Cr</div>
    </div>
  );
}

/* ============================== main app ============================== */

export default function App() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [scenario, setScenario] = useState('Base');
  const [openSections, setOpenSections] = useState({ capital: true, revenue: true });

  const handleChange = useCallback((key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);
  const handleReset = useCallback(() => setInputs({ ...DEFAULTS }), []);
  const toggleSection = useCallback((id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const handleDownloadPdf = useCallback(() => {
    const prevTitle = document.title;
    const stamp = new Date().toISOString().slice(0, 10);
    document.title = `PU-Foam-ROI_${scenario}_${stamp}`;
    window.print();
    document.title = prevTitle;
  }, [scenario]);

  const result = useMemo(() => computeModel(inputs, scenario), [inputs, scenario]);
  const stillPlaceholder = PLACEHOLDER_KEYS.filter((k) => inputs[k] === DEFAULTS[k]).length;

  const capexData = useMemo(() => ([
    { name: 'Machine + GST', value: inputs.ultimaExWorks * (1 + inputs.gstPercent / 100) },
    { name: 'Installation', value: inputs.installationLabour },
    { name: 'Commissioning', value: inputs.commissioningExpert },
    { name: 'Freight & insurance', value: inputs.freightInsurance },
    { name: 'Infrastructure', value: inputs.infrastructureCost },
  ]), [inputs]);

  const cashFlowData = useMemo(() => {
    let running = 0;
    return result.cashFlows.map((cf, i) => {
      running += cf;
      return { year: i === 0 ? 'Now' : `Yr ${i}`, flow: cf / 1e7, cumulative: running / 1e7 };
    });
  }, [result]);

  const sensitivityData = useMemo(() => {
    const swing = 0.2;
    const levers = [
      { label: 'Selling price', key: 'priceMult' },
      { label: 'Raw material cost', key: 'materialMult' },
      { label: 'Ramp-up speed', key: 'rampMult' },
      { label: 'Electricity tariff', key: 'elecMult' },
      { label: 'Manpower cost', key: 'manpowerMult' },
    ];
    const rows = levers.map((l) => {
      const up = computeModel(inputs, scenario, { [l.key]: 1 + swing }).npv / 1e7;
      const down = computeModel(inputs, scenario, { [l.key]: 1 - swing }).npv / 1e7;
      return { name: l.label, low: Math.min(up, down), high: Math.max(up, down), spread: Math.abs(up - down) };
    });
    rows.sort((a, b) => b.spread - a.spread);
    return rows;
  }, [inputs, scenario]);

  const baseNpvCr = result.npv / 1e7;
  const allSensVals = sensitivityData.flatMap((d) => [d.low, d.high]).concat([baseNpvCr, 0]);
  const axisMin = Math.floor(Math.min(...allSensVals) - 2);
  const axisMax = Math.ceil(Math.max(...allSensVals) + 2);
  const sensChartData = sensitivityData.map((d) => ({
    name: d.name, offset: d.low - axisMin, range: d.high - d.low, low: d.low, high: d.high,
  }));

  const headline = [
    {
      key: 'npv', label: 'Net present value', sub: `at ${inputs.discountRatePct}% discount rate`,
      value: baseNpvCr, format: formatINRCompact(result.npv),
      min: -Math.abs(result.totalCapex) / 1e7,
      max: Math.max(result.totalCapex * 2, Math.abs(result.npv) * 1.3, result.totalCapex) / 1e7,
      crossValue: 0, goodDirection: 'high',
    },
    {
      key: 'irr', label: 'IRR', sub: `vs ${inputs.discountRatePct}% hurdle rate`,
      value: result.irr !== null ? result.irr * 100 : -20,
      format: result.irr !== null ? `${(result.irr * 100).toFixed(1)}%` : 'not solvable',
      min: -20, max: 100, crossValue: inputs.discountRatePct, goodDirection: 'high',
    },
    {
      key: 'payback', label: 'Payback period', sub: `over a ${result.horizon}-year horizon`,
      value: result.paybackYear ?? result.horizon,
      format: result.paybackYear ? `Year ${result.paybackYear}` : `Beyond Yr ${result.horizon}`,
      min: 0, max: result.horizon, crossValue: result.horizon / 2, goodDirection: 'low',
    },
    {
      key: 'capacity', label: 'Capacity used by pipeline', sub: "of the machine's rated output",
      value: result.capacityUtilizationPct, format: `${result.capacityUtilizationPct.toFixed(1)}%`,
      min: 0, max: 100, neutral: true,
    },
  ];

  return (
    <div className="roi-app">
      <style>{`
        .roi-app { font-family:'IBM Plex Sans',system-ui,-apple-system,sans-serif; color:#1B2430; background:#F7F3EA; padding-bottom:48px; }
        .roi-app * { box-sizing:border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .roi-hero { background:linear-gradient(160deg,#0E1B2A,#16283D); color:#F2EFE6; padding:32px 26px 26px; }
        .roi-hero__eyebrow { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:#8FB7A8; margin-bottom:10px; }
        .roi-hero__title { font-family:'Space Grotesk',sans-serif; font-size:clamp(21px,4vw,30px); font-weight:700; margin:0 0 8px; letter-spacing:-0.01em; }
        .roi-hero__sub { font-size:13.5px; color:#B9C2CC; max-width:620px; margin:0 0 18px; line-height:1.5; }
        .roi-hero__controls { display:flex; flex-wrap:wrap; align-items:center; gap:14px; }
        .roi-scenario { display:inline-flex; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); border-radius:6px; padding:3px; }
        .roi-scenario__btn { font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:0.04em; padding:7px 14px; border:none; background:transparent; color:#B9C2CC; border-radius:4px; cursor:pointer; }
        .roi-scenario__btn.is-active { background:#1F6F5C; color:#fff; }
        .roi-reset { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#B9C2CC; background:transparent; border:1px solid rgba(255,255,255,0.2); border-radius:6px; padding:7px 12px; cursor:pointer; }
        .roi-reset:hover { border-color:#8FB7A8; color:#8FB7A8; }
        .roi-download { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#0E1B2A; background:#8FB7A8; border:1px solid #8FB7A8; border-radius:6px; padding:7px 12px; cursor:pointer; }
        .roi-download:hover { background:#A8CBBC; border-color:#A8CBBC; }

        .roi-banner { display:flex; align-items:center; gap:10px; font-size:12.5px; padding:10px 26px; }
        .roi-banner--amber { background:#FBF0DE; color:#7A4A12; border-bottom:1px solid #EED9B4; }
        .roi-banner--green { background:#E6F1EC; color:#1F6F5C; border-bottom:1px solid #C9E2D6; }
        .roi-banner svg { flex:0 0 auto; }

        .roi-gaugerow { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:1px; background:#DED7C6; border-bottom:1px solid #DED7C6; }
        .roi-gauge { background:#FFFFFF; padding:16px 18px 14px; }
        .roi-gauge__top { display:flex; flex-direction:column; margin-bottom:9px; }
        .roi-gauge__value { font-family:'IBM Plex Mono',monospace; font-size:21px; font-weight:600; line-height:1.1; }
        .roi-gauge__label { font-size:11.5px; color:#6B7280; margin-top:2px; }
        .roi-gauge__track { position:relative; height:8px; border-radius:4px; margin-bottom:8px; }
        .roi-gauge__marker { position:absolute; top:-3px; width:3px; height:14px; background:#1B2430; border-radius:1px; transform:translateX(-50%); box-shadow:0 0 0 2px #fff; }
        .roi-gauge__sub { font-size:10.5px; color:#9AA0A6; }

        .roi-layout { display:grid; grid-template-columns:1fr; gap:22px; padding:22px 26px 0; max-width:1360px; margin:0 auto; }
        @media (min-width:980px) { .roi-layout { grid-template-columns:1.25fr 1fr; align-items:start; } .roi-charts { position:sticky; top:16px; } }

        .roi-legend { display:flex; flex-wrap:wrap; gap:16px; font-size:11.5px; color:#6B7280; margin-bottom:12px; }
        .roi-legend span { display:inline-flex; align-items:center; gap:6px; }

        .roi-dot { width:8px; height:8px; border-radius:50%; flex:0 0 auto; }
        .roi-dot.is-real { background:#1F6F5C; }
        .roi-dot.is-estimate { background:#C67A2E; }

        .roi-section { background:#FFFFFF; border:1px solid #DED7C6; border-radius:6px; margin-bottom:12px; overflow:hidden; }
        .roi-section__header { width:100%; display:flex; align-items:center; gap:12px; padding:13px 15px; background:none; border:none; cursor:pointer; text-align:left; }
        .roi-section__num { font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:#9AA0A6; background:#F1EEE3; border-radius:4px; padding:3px 7px; flex:0 0 auto; }
        .roi-section__titlewrap { flex:1; display:flex; flex-direction:column; }
        .roi-section__title { font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:14.5px; }
        .roi-section__blurb { font-size:11.5px; color:#6B7280; margin-top:2px; }
        .roi-badge { font-size:10.5px; background:#FBF0DE; color:#7A4A12; border:1px solid #EED9B4; border-radius:20px; padding:3px 9px; flex:0 0 auto; white-space:nowrap; }
        .roi-chev { transition:transform 0.15s ease; color:#9AA0A6; flex:0 0 auto; }
        .roi-chev.is-open { transform:rotate(180deg); }

        .roi-section__body { padding:8px 15px 16px; display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; border-top:1px solid #EFEADE; }

        .roi-field { display:flex; flex-direction:column; gap:6px; }
        .roi-field--bool { flex-direction:row; align-items:flex-start; justify-content:space-between; gap:10px; }
        .roi-field--bool .roi-field__labelrow { flex:1; }
        .roi-field__labelrow { display:flex; align-items:center; gap:7px; }
        .roi-field__label { font-size:12px; font-weight:500; }
        .roi-field__unit { font-size:10.5px; color:#9AA0A6; margin-left:auto; }
        .roi-field__inputrow { display:flex; flex-direction:column; gap:6px; }
        .roi-input { font-family:'IBM Plex Mono',monospace; font-size:12.5px; border:1px solid #DED7C6; border-radius:4px; padding:7px 9px; background:#FCFAF4; color:#1B2430; width:100%; }
        .roi-input:focus { outline:2px solid #1F6F5C; outline-offset:1px; border-color:#1F6F5C; }
        .roi-slider { width:100%; accent-color:#1F6F5C; }
        .roi-field__hint { font-size:10.5px; color:#9AA0A6; margin:0; }
        .roi-field__help { font-size:10.5px; color:#8A8375; line-height:1.4; margin:0; }

        .roi-toggle { width:38px; height:21px; border-radius:11px; background:#DED7C6; border:none; position:relative; cursor:pointer; flex:0 0 auto; }
        .roi-toggle.is-on { background:#1F6F5C; }
        .roi-toggle__thumb { position:absolute; top:2px; left:2px; width:17px; height:17px; border-radius:50%; background:#fff; transition:transform 0.15s ease; }
        .roi-toggle.is-on .roi-toggle__thumb { transform:translateX(17px); }

        .roi-segmented { display:inline-flex; border:1px solid #DED7C6; border-radius:5px; overflow:hidden; width:fit-content; }
        .roi-segmented__opt { font-size:12px; padding:6px 12px; border:none; background:#fff; color:#6B7280; cursor:pointer; }
        .roi-segmented__opt.is-active { background:#1F6F5C; color:#fff; }

        .roi-charts { display:flex; flex-direction:column; gap:16px; }
        .roi-card { background:#FFFFFF; border:1px solid #DED7C6; border-radius:6px; padding:16px 18px 6px; }
        .roi-card__title { font-family:'Space Grotesk',sans-serif; font-size:13.5px; font-weight:600; margin:0 0 4px; }
        .roi-card__note { font-size:11px; color:#8A8375; margin:0 0 6px; }
        .roi-tip { background:#fff; border:1px solid #DED7C6; border-radius:4px; padding:7px 10px; font-size:11.5px; }

        .roi-foot { text-align:center; font-size:11px; color:#9AA0A6; padding:26px 20px 0; }

        .roi-print-report { display:none; }
        @media print {
          @page { margin:15mm; }
          .roi-app { background:#fff; padding:0; }
          .roi-screen-only { display:none !important; }
          .roi-print-report { display:block !important; font-family:'IBM Plex Sans',Arial,sans-serif; color:#111; }
          .rp-eyebrow { font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:#555; }
          .roi-print-report h1 { font-family:'Space Grotesk',sans-serif; font-size:19px; margin:4px 0; }
          .rp-meta { font-size:11px; color:#444; margin-bottom:14px; }
          .rp-table { width:100%; border-collapse:collapse; margin-bottom:12px; font-size:10.5px; }
          .rp-table td { padding:3px 6px; border-bottom:1px solid #ddd; }
          .rp-table td:first-child { width:65%; color:#333; }
          .rp-table td:nth-child(2) { text-align:right; font-family:'IBM Plex Mono',monospace; white-space:nowrap; }
          .rp-headline td:first-child { font-weight:600; width:40%; }
          .rp-headline td:nth-child(2) { font-weight:600; }
          .rp-headline td:nth-child(3) { color:#666; font-size:10px; }
          .rp-section { break-inside:avoid; margin-bottom:8px; }
          .rp-section h2 { font-size:12px; font-family:'Space Grotesk',sans-serif; margin:8px 0 4px; border-bottom:1px solid #999; padding-bottom:3px; }
          .rp-footnote { font-size:9.5px; color:#666; margin-top:12px; }
        }
      `}</style>

      <div className="roi-screen-only">
      <header className="roi-hero">
        <div className="roi-hero__eyebrow">Supreme PPD · Backward Integration</div>
        <h1 className="roi-hero__title">PU Foam ROI — Instrument Panel</h1>
        <p className="roi-hero__sub">
          Move a slider or type a number below — every reading on this panel updates immediately.
          No formulas, no spreadsheet, no code.
        </p>
        <div className="roi-hero__controls">
          <div className="roi-scenario">
            {['Worst', 'Base', 'Best'].map((s) => (
              <button key={s} type="button" className={`roi-scenario__btn ${scenario === s ? 'is-active' : ''}`} onClick={() => setScenario(s)}>
                {s}
              </button>
            ))}
          </div>
          <button type="button" className="roi-download" onClick={handleDownloadPdf}>
            <Download size={13} /> Download PDF
          </button>
          <button type="button" className="roi-reset" onClick={handleReset}>
            <RotateCcw size={13} /> Reset to defaults
          </button>
        </div>
      </header>

      {stillPlaceholder > 0 ? (
        <div className="roi-banner roi-banner--amber">
          <AlertTriangle size={16} />
          <span><strong>{stillPlaceholder} of {PLACEHOLDER_KEYS.length} estimated fields</strong> are still on their starting guess — open the sections below and replace them with real numbers as you get them.</span>
        </div>
      ) : (
        <div className="roi-banner roi-banner--green">
          <CheckCircle2 size={16} />
          <span>Every estimated field has been reviewed at least once — these numbers reflect your own inputs.</span>
        </div>
      )}

      <div className="roi-gaugerow">
        {headline.map((g) => <LinearGauge key={g.key} {...g} />)}
      </div>

      <div className="roi-layout">
        <div className="roi-inputs">
          <div className="roi-legend">
            <span><span className="roi-dot is-real" /> Confirmed number (vendor quote or your own pipeline data)</span>
            <span><span className="roi-dot is-estimate" /> Your estimate — worth double-checking</span>
          </div>
          {SECTIONS.map((sec) => (
            <Section
              key={sec.id}
              section={sec}
              values={inputs}
              onChange={handleChange}
              open={!!openSections[sec.id]}
              onToggle={() => toggleSection(sec.id)}
            />
          ))}
        </div>

        <div className="roi-charts">
          <div className="roi-card">
            <h3 className="roi-card__title">Where the {formatINRCompact(result.totalCapex)} capex goes</h3>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={capexData} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78} paddingAngle={2}>
                  {capexData.map((d, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINRCompact(v)} />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="roi-card">
            <h3 className="roi-card__title">Cash flow & payback</h3>
            <p className="roi-card__note">Bars are the cash moving that year; the line is the running total.</p>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={cashFlowData} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E4D6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)} Cr`} />
                <ReferenceLine y={0} stroke="#9AA0A6" />
                <Bar dataKey="flow" name="Annual cash flow (₹ Cr)" radius={[3, 3, 0, 0]}>
                  {cashFlowData.map((d, i) => <Cell key={i} fill={d.flow < 0 ? '#B23A2E' : '#1F6F5C'} />)}
                </Bar>
                <Line type="monotone" dataKey="cumulative" name="Cumulative (₹ Cr)" stroke="#C67A2E" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="roi-card">
            <h3 className="roi-card__title">What moves the outcome most</h3>
            <p className="roi-card__note">Each bar is the NPV range if that input is ±20% off. Longer bars matter more.</p>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={sensChartData} layout="vertical" margin={{ top: 6, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E4D6" horizontal={false} />
                <XAxis type="number" domain={[0, axisMax - axisMin]} tickFormatter={(v) => formatAxisCr(v + axisMin)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={108} tick={{ fontSize: 11 }} />
                <Tooltip content={<SensTooltip />} />
                <ReferenceLine x={baseNpvCr - axisMin} stroke="#1B2430" strokeDasharray="4 3" label={{ value: 'Base', position: 'top', fontSize: 10, fill: '#1B2430' }} />
                <Bar dataKey="offset" stackId="a" fill="transparent" />
                <Bar dataKey="range" stackId="a" fill="#4C7A9C" radius={[3, 3, 3, 3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <p className="roi-foot">
        Illustrative model, not financial advice — the numbers are only as good as the estimates fed into them.
      </p>
      </div>

      <div className="roi-print-report">
        <div className="rp-eyebrow">Supreme PPD · Backward Integration</div>
        <h1>PU Foam ROI — Calculation Summary</h1>
        <div className="rp-meta">
          Scenario: <strong>{scenario}</strong> &nbsp;·&nbsp; Generated {new Date().toLocaleString('en-IN')}
        </div>

        <table className="rp-table rp-headline">
          <tbody>
            <tr><td>Net present value</td><td>{formatINRCompact(result.npv)}</td><td>at {inputs.discountRatePct}% discount rate</td></tr>
            <tr><td>IRR</td><td>{result.irr !== null ? `${(result.irr * 100).toFixed(1)}%` : 'not solvable'}</td><td>vs {inputs.discountRatePct}% hurdle rate</td></tr>
            <tr><td>Payback period</td><td>{result.paybackYear ? `Year ${result.paybackYear}` : `Beyond Yr ${result.horizon}`}</td><td>over a {result.horizon}-year horizon</td></tr>
            <tr><td>Capacity used by pipeline</td><td>{result.capacityUtilizationPct.toFixed(1)}%</td><td>of the machine's rated output</td></tr>
            <tr><td>Total capex (landed)</td><td>{formatINRCompact(result.totalCapex)}</td><td></td></tr>
            <tr><td>Total identified pipeline</td><td>{formatINRCompact(result.totalPipeline)}</td><td></td></tr>
          </tbody>
        </table>

        {SECTIONS.map((sec) => (
          <div key={sec.id} className="rp-section">
            <h2>{sec.num} · {sec.title}</h2>
            <table className="rp-table">
              <tbody>
                {FIELDS.filter((f) => f.section === sec.id).map((f) => (
                  <tr key={f.key}>
                    <td>{f.label}{!f.real ? ' *' : ''}</td>
                    <td>{formatFieldValue(f, inputs[f.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <p className="rp-footnote">* estimate, not a confirmed figure — {stillPlaceholder} of {PLACEHOLDER_KEYS.length} were still on their starting guess when this was generated. Illustrative model, not financial advice.</p>
      </div>
    </div>
  );
}
