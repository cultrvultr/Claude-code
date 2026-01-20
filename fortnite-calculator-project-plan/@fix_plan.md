# Fortnite Map Acquisition Calculator - Fix Plan

## Phase 1: Core Calculator (High Priority) - COMPLETE
- [x] Initialize Vite + React + TypeScript project
- [x] Install and configure Tailwind CSS
- [x] Create TypeScript interfaces (CalculatorInputs, BrandDeal, MonthProjection, CalculatorResults)
- [x] Implement calculation utilities (CCU decay, earnings, earn-back period)
- [x] Create InputSection component (investment, ownership %, CCU, decay rate, floor)
- [x] Create SummaryMetrics component (earn-back periods, monthly earnings)
- [x] Create basic ProjectionTable component (36-month data)
- [x] Wire up useCalculator hook for real-time calculations

## Phase 2: Brand Deals (High Priority) - COMPLETE
- [x] Create BrandDealsSection component with add/remove functionality
- [x] Integrate brand deals into projection calculations
- [x] Add brand deal columns to projection table
- [x] Calculate earn-back period with brand deals

## Phase 3: Visualizations (Medium Priority) - COMPLETE
- [x] Install Recharts library
- [x] Create EarningsChart component (cumulative earnings line)
- [x] Add break-even reference line to chart
- [x] Create CCUChart component (decay visualization)
- [x] Add interactive tooltips to charts

## Phase 4: Polish & Export (Medium Priority) - COMPLETE
- [x] Add currency/percentage formatting utilities
- [x] Implement input validation (min/max values, required fields)
- [x] Add CSV export functionality
- [x] Ensure responsive design for tablet/desktop
- [x] Style editable fields with blue highlight

## Phase 5: Enhancements (Low Priority) - COMPLETE
- [x] Add localStorage for saving/loading scenarios
- [ ] Implement scenario comparison feature (deferred)
- [x] Add shareable URL with encoded parameters
- [ ] Add dark mode toggle (deferred)

## Completed
- [x] Project planning and specifications
- [x] Core calculator implementation
- [x] Brand deals integration
- [x] Charts and visualizations
- [x] Export, save/load, and share functionality
- [x] Toolbar with all actions
- [x] Reset to defaults button

## Notes
- Refer to specs/fortnite-calculator-project-plan.md for full details
- Use sample data from spreadsheet for testing:
  - Investment: $200,000, Ownership: 25%, CCU: 2,000
  - Decay: -5%/month, Floor: 500 CCU
  - Expected earn-back: 8 months (simple), 10 months (with brand deals)
- All core features implemented and working
- Scenario comparison and dark mode deferred as optional future enhancements
