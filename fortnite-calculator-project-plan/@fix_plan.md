# Fortnite Map Acquisition Calculator - Fix Plan

## Phase 1: Core Calculator (High Priority)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install and configure Tailwind CSS
- [ ] Create TypeScript interfaces (CalculatorInputs, BrandDeal, MonthProjection, CalculatorResults)
- [ ] Implement calculation utilities (CCU decay, earnings, earn-back period)
- [ ] Create InputSection component (investment, ownership %, CCU, decay rate, floor)
- [ ] Create SummaryMetrics component (earn-back periods, monthly earnings)
- [ ] Create basic ProjectionTable component (36-month data)
- [ ] Wire up useCalculator hook for real-time calculations

## Phase 2: Brand Deals (High Priority)
- [ ] Create BrandDealsSection component with add/remove functionality
- [ ] Integrate brand deals into projection calculations
- [ ] Add brand deal columns to projection table
- [ ] Calculate earn-back period with brand deals

## Phase 3: Visualizations (Medium Priority)
- [ ] Install Recharts library
- [ ] Create EarningsChart component (cumulative earnings line)
- [ ] Add break-even reference line to chart
- [ ] Create CCUChart component (decay visualization)
- [ ] Add interactive tooltips to charts

## Phase 4: Polish & Export (Medium Priority)
- [ ] Add currency/percentage formatting utilities
- [ ] Implement input validation (min/max values, required fields)
- [ ] Add CSV export functionality
- [ ] Ensure responsive design for tablet/desktop
- [ ] Style editable fields with blue highlight

## Phase 5: Enhancements (Low Priority)
- [ ] Add localStorage for saving/loading scenarios
- [ ] Implement scenario comparison feature
- [ ] Add shareable URL with encoded parameters
- [ ] Add dark mode toggle

## Completed
- [x] Project planning and specifications

## Notes
- Refer to specs/fortnite-calculator-project-plan.md for full details
- Use sample data from spreadsheet for testing:
  - Investment: $200,000, Ownership: 25%, CCU: 2,000
  - Decay: -5%/month, Floor: 500 CCU
  - Expected earn-back: 8 months (simple), 10 months (with brand deals)
- Focus on accurate calculations before UI polish
