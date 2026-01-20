import { useCalculator } from './hooks/useCalculator';
import { InputSection } from './components/InputSection';
import { BrandDealsSection } from './components/BrandDealsSection';
import { SummaryMetrics } from './components/SummaryMetrics';
import { ProjectionTable } from './components/ProjectionTable';
import { EarningsChart } from './components/EarningsChart';
import { CCUChart } from './components/CCUChart';
import { Toolbar } from './components/Toolbar';

function App() {
  const {
    inputs,
    brandDeals,
    results,
    updateInput,
    addBrandDeal,
    updateBrandDeal,
    removeBrandDeal,
    loadState,
    resetToDefaults,
  } = useCalculator();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Fortnite Map Acquisition Calculator
          </h1>
          <p className="text-gray-600">
            Calculate ROI and earn-back periods for Fortnite Creative map investments
          </p>
        </header>

        <Toolbar
          inputs={inputs}
          brandDeals={brandDeals}
          results={results}
          onLoadScenario={loadState}
        />

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 space-y-6">
            <InputSection inputs={inputs} onUpdate={updateInput} />
            <BrandDealsSection
              brandDeals={brandDeals}
              totalBrandDeals={results.totalBrandDeals}
              onAdd={addBrandDeal}
              onUpdate={updateBrandDeal}
              onRemove={removeBrandDeal}
            />
            <button
              onClick={resetToDefaults}
              className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <SummaryMetrics results={results} investmentSum={inputs.investmentSum} />
            <EarningsChart
              projections={results.projections}
              investmentSum={inputs.investmentSum}
            />
            <CCUChart
              projections={results.projections}
              startingCCU={inputs.startingCCU}
              ccuFloor={inputs.ccuFloor}
            />
          </div>
        </div>

        <ProjectionTable projections={results.projections} />

        <footer className="mt-8 text-center text-sm text-gray-500">
          <p>Based on ${inputs.earningsPerCCU} earnings per CCU per month</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
