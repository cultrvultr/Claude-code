# Fortnite Map Acquisition Calculator - Project Plan

## Overview

A web application that helps investors calculate ROI and earn-back periods for Fortnite Creative map acquisitions. The calculator models revenue based on CCU (Concurrent Users), ownership percentage, CCU decay over time, and brand deal income.

---

## Business Logic Summary

### Core Concept
When investing in a Fortnite Creative map, earnings are generated based on player engagement (CCU). This calculator helps investors understand:
- How long until they recover their investment
- Projected earnings over time
- Impact of CCU decay on returns
- Value of brand deals

### Key Formula
```
Monthly Earnings = CCU × $50 (per CCU rate)
Investor Earnings = Monthly Earnings × Ownership %
```

---

## Features

### 1. Input Section
User-configurable parameters (highlighted as editable):

| Input | Description | Example |
|-------|-------------|---------|
| Investment Sum (USD) | Total investment amount | $200,000 |
| Ownership Percentage | % of map owned by investor | 25% |
| Starting CCU | Initial concurrent users | 2,000 |
| Earnings per CCU | Revenue per concurrent user | $50 |
| CCU Decay Rate | Monthly decline percentage | -5% |
| CCU Floor | Minimum CCU (bottom estimate) | 500 |

### 2. Brand Deals Section
Dynamic list of brand deals:
- Brand name
- Deal amount (USD)
- Month of payment

### 3. Summary Metrics (Auto-calculated)
- **Earn-back period (simple)**: Months to recover investment without CCU decay or brand deals
- **Earn-back period (realistic)**: Months to recover investment with CCU decay and brand deals
- **Total brand deal value**
- **Monthly earnings at ownership %**

### 4. Projection Table
36-month projection showing:

| Column | Description |
|--------|-------------|
| Month | 1-36 |
| CCU | Current concurrent users |
| Change % (monthly) | Monthly CCU change |
| Change % (total) | Cumulative CCU change from start |
| Earnings 100% | Full monthly earnings |
| Earnings (ownership %) | Investor's share of earnings |
| Cumulative Earnings 100% | Running total (full) |
| Cumulative Earnings (ownership %) | Running total (investor) |
| Earned Back (no deals) | Month when investment recovered |
| Brand Deal (monthly) | Brand deal income this month |
| Brand Deal (cumulative) | Total brand deal income to date |
| Earnings + Brand Deals | Combined cumulative earnings |
| Earned Back (with deals) | Month when investment recovered (including deals) |
| Break-even Line | Investment amount for visual reference |

### 5. Visualizations
- **Earnings Chart**: Line graph showing cumulative earnings vs. investment amount
- **CCU Decay Chart**: Line graph showing CCU decline over time
- **Break-even Indicator**: Visual marker showing when investment is recovered

---

## Technical Architecture

### Recommended Tech Stack

**Frontend Framework**: React + TypeScript
- Component-based architecture
- Strong typing for financial calculations
- Rich ecosystem for charts/UI

**Styling**: Tailwind CSS
- Rapid UI development
- Responsive design out of the box
- Clean, professional look

**Charts**: Recharts or Chart.js
- Line charts for projections
- Area charts for cumulative values
- Reference lines for break-even

**State Management**: React useState/useReducer
- Calculator is self-contained
- No need for complex state management

**Build Tool**: Vite
- Fast development experience
- Optimized production builds

### Alternative: Next.js
If future features require:
- SEO optimization
- Server-side calculations
- User accounts/saved calculations

---

## Component Structure

```
src/
├── components/
│   ├── Calculator/
│   │   ├── InputSection.tsx        # Investment parameters
│   │   ├── BrandDealsSection.tsx   # Dynamic brand deal list
│   │   ├── SummaryMetrics.tsx      # Key calculated values
│   │   ├── ProjectionTable.tsx     # 36-month data table
│   │   └── index.tsx               # Main calculator container
│   ├── Charts/
│   │   ├── EarningsChart.tsx       # Cumulative earnings visualization
│   │   ├── CCUChart.tsx            # CCU decay visualization
│   │   └── BreakEvenChart.tsx      # Combined view with break-even
│   └── UI/
│       ├── NumberInput.tsx         # Formatted currency/number input
│       ├── PercentInput.tsx        # Percentage input
│       ├── DataTable.tsx           # Reusable table component
│       └── Card.tsx                # Section container
├── hooks/
│   ├── useCalculator.ts            # Main calculation logic
│   └── useProjection.ts            # 36-month projection generator
├── utils/
│   ├── calculations.ts             # Pure calculation functions
│   ├── formatters.ts               # Currency/number formatting
│   └── constants.ts                # Default values
├── types/
│   └── calculator.ts               # TypeScript interfaces
├── App.tsx
└── main.tsx
```

---

## Data Types

```typescript
interface CalculatorInputs {
  investmentSum: number;
  ownershipPercent: number;
  startingCCU: number;
  earningsPerCCU: number;
  ccuDecayRate: number;       // negative percentage, e.g., -0.05
  ccuFloor: number;
}

interface BrandDeal {
  id: string;
  name: string;
  amount: number;
  month: number;
}

interface MonthProjection {
  month: number;
  ccu: number;
  ccuChangeMonthly: number;
  ccuChangeTotal: number;
  earningsFull: number;
  earningsOwnership: number;
  cumulativeEarningsFull: number;
  cumulativeEarningsOwnership: number;
  earnedBackNoBrands: boolean;
  brandDealMonthly: number;
  brandDealCumulative: number;
  earningsWithBrands: number;
  earnedBackWithBrands: boolean;
}

interface CalculatorResults {
  earnBackPeriodSimple: number;       // months
  earnBackPeriodRealistic: number;    // months
  totalBrandDeals: number;
  monthlyEarningsAtOwnership: number;
  projections: MonthProjection[];
}
```

---

## Calculation Logic

### CCU Decay
```typescript
function calculateCCU(
  startingCCU: number,
  decayRate: number,
  month: number,
  floor: number
): number {
  const decayedCCU = startingCCU * Math.pow(1 + decayRate, month - 1);
  return Math.max(decayedCCU, floor);
}
```

### Monthly Earnings
```typescript
function calculateMonthlyEarnings(
  ccu: number,
  earningsPerCCU: number,
  ownershipPercent: number
): { full: number; ownership: number } {
  const full = ccu * earningsPerCCU;
  return {
    full,
    ownership: full * ownershipPercent
  };
}
```

### Earn-back Period (Simple)
```typescript
function calculateSimpleEarnBack(
  investment: number,
  monthlyEarnings: number
): number {
  return investment / monthlyEarnings;
}
```

### Earn-back Period (Realistic)
```typescript
function findEarnBackMonth(
  projections: MonthProjection[],
  investment: number,
  includeBrandDeals: boolean
): number | null {
  const earningsKey = includeBrandDeals
    ? 'earningsWithBrands'
    : 'cumulativeEarningsOwnership';

  const month = projections.find(p => p[earningsKey] >= investment);
  return month?.month ?? null;
}
```

---

## UI/UX Design Guidelines

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Fortnite Map Acquisition Calculator                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │   INPUT SECTION     │  │     SUMMARY METRICS         │   │
│  │                     │  │                             │   │
│  │  Investment: $____  │  │  Earn-back (simple): X mo   │   │
│  │  Ownership:   ___% │  │  Earn-back (real): X mo     │   │
│  │  Starting CCU: ____ │  │  Monthly earnings: $____    │   │
│  │  Per CCU: $____     │  │  Total brand deals: $____   │   │
│  │  Decay rate:  ___% │  │                             │   │
│  │  CCU floor:   ____  │  └─────────────────────────────┘   │
│  └─────────────────────┘                                    │
│  ┌─────────────────────┐                                    │
│  │   BRAND DEALS       │                                    │
│  │  + Add Brand Deal   │                                    │
│  │  ┌───────────────┐  │                                    │
│  │  │ Brand A $1000 │  │                                    │
│  │  │ Month: 3   [x]│  │                                    │
│  │  └───────────────┘  │                                    │
│  └─────────────────────┘                                    │
├─────────────────────────────────────────────────────────────┤
│                    EARNINGS CHART                           │
│  $300k ─┬─────────────────────────────●──────────────       │
│         │                         ●                         │
│  $200k ─┼─────────────────────●───────────────────── ← Investment
│         │                 ●                                 │
│  $100k ─┼─────────────●                                     │
│         │         ●                                         │
│      0 ─┼─────●─────────────────────────────────────        │
│         └──────────────────────────────────────────→        │
│           1  3  6  9  12  15  18  21  24  27  30  33  36    │
├─────────────────────────────────────────────────────────────┤
│                  PROJECTION TABLE                           │
│  ┌──────┬──────┬────────┬──────────┬────────────┬────────┐  │
│  │Month │ CCU  │Change %│ Earnings │ Cumulative │Earned? │  │
│  ├──────┼──────┼────────┼──────────┼────────────┼────────┤  │
│  │  1   │2,000 │  -5%   │ $25,000  │  $25,000   │   -    │  │
│  │  2   │1,900 │  -10%  │ $23,750  │  $48,750   │   -    │  │
│  │ ...  │ ...  │  ...   │   ...    │    ...     │  ...   │  │
│  └──────┴──────┴────────┴──────────┴────────────┴────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles
1. **Editable fields highlighted** (blue background or border)
2. **Real-time calculations** - update as user types
3. **Clear visual break-even indicator** on charts
4. **Responsive** - works on desktop and tablet
5. **Export functionality** - download as CSV/PDF

---

## Implementation Phases

### Phase 1: Core Calculator
- [ ] Project setup (Vite + React + TypeScript + Tailwind)
- [ ] Input section with all parameters
- [ ] Calculation engine (hooks + utils)
- [ ] Summary metrics display
- [ ] Basic projection table

### Phase 2: Brand Deals
- [ ] Dynamic brand deal list (add/remove)
- [ ] Integration with projection calculations
- [ ] Brand deal column in table

### Phase 3: Visualizations
- [ ] Earnings chart with break-even line
- [ ] CCU decay chart
- [ ] Interactive tooltips

### Phase 4: Polish & Export
- [ ] Number formatting (currency, percentages)
- [ ] Input validation
- [ ] CSV export
- [ ] PDF export (optional)
- [ ] Mobile responsiveness

### Phase 5: Enhancements (Optional)
- [ ] Save/load scenarios (localStorage)
- [ ] Compare multiple scenarios
- [ ] Shareable links
- [ ] Dark mode

---

## File Structure for Initial Setup

```bash
# Initialize project
npm create vite@latest fortnite-calculator -- --template react-ts
cd fortnite-calculator

# Install dependencies
npm install tailwindcss postcss autoprefixer
npm install recharts
npm install @heroicons/react  # for icons
npm install clsx              # for conditional classes

# Initialize Tailwind
npx tailwindcss init -p
```

---

## Testing Strategy

### Unit Tests
- Calculation functions (CCU decay, earnings, earn-back period)
- Edge cases (0 values, negative values, floor limits)

### Integration Tests
- Full calculation flow with sample data
- Brand deal integration

### E2E Tests (Optional)
- User input flow
- Chart rendering
- Export functionality

---

## Sample Test Data

Based on the provided spreadsheet:

```typescript
const sampleInputs: CalculatorInputs = {
  investmentSum: 200000,
  ownershipPercent: 0.25,
  startingCCU: 2000,
  earningsPerCCU: 50,
  ccuDecayRate: -0.05,
  ccuFloor: 500
};

const sampleBrandDeals: BrandDeal[] = [
  { id: '1', name: 'Brand A', amount: 1000, month: 3 },
  { id: '2', name: 'Brand B', amount: 3000, month: 5 },
  { id: '3', name: 'Brand C', amount: 3000, month: 6 }
];

// Expected results:
// - Earn-back (simple): 8 months
// - Earn-back (realistic with brand deals): 10 months
// - Total brand deals: $7,000
// - Monthly earnings at 25%: $25,000 (at start)
```

---

## Deployment Options

1. **Vercel** - Best for React/Next.js, free tier available
2. **Netlify** - Easy deployment, free tier
3. **GitHub Pages** - Free, good for static builds
4. **AWS Amplify** - More control, scales well

---

## Future Considerations

1. **Multiple Scenarios**: Compare different investment amounts or ownership percentages
2. **Historical Data**: Import actual CCU data from Fortnite API
3. **User Accounts**: Save calculations, track actual vs. projected
4. **API Integration**: Connect to Fortnite Creative analytics
5. **Team Features**: Share calculations with co-investors

---

## Summary

This calculator transforms a complex spreadsheet into an intuitive web application that helps Fortnite map investors:

1. **Input** their investment parameters
2. **Add** brand deals with timing
3. **See** instant calculations for ROI and earn-back periods
4. **Visualize** earnings projections over 36 months
5. **Export** data for further analysis

The modular architecture allows for iterative development and future enhancements.
