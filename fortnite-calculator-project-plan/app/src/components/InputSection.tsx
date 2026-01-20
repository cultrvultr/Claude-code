import type { CalculatorInputs } from '../types/calculator';

interface InputSectionProps {
  inputs: CalculatorInputs;
  onUpdate: <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) => void;
}

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

function InputField({ label, value, onChange, prefix, suffix, min, max, step = 1 }: InputFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className={`w-full px-3 py-2 border-2 border-blue-300 rounded-lg bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-12' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export function InputSection({ inputs, onUpdate }: InputSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Investment Parameters</h2>
      <p className="text-sm text-blue-600 mb-4">Blue fields are editable</p>

      <InputField
        label="Investment Sum (USD)"
        value={inputs.investmentSum}
        onChange={(v) => onUpdate('investmentSum', v)}
        prefix="$"
        min={0}
        step={1000}
      />

      <InputField
        label="Ownership Percentage"
        value={inputs.ownershipPercent}
        onChange={(v) => onUpdate('ownershipPercent', v)}
        suffix="%"
        min={0}
        max={100}
        step={1}
      />

      <InputField
        label="Starting CCU"
        value={inputs.startingCCU}
        onChange={(v) => onUpdate('startingCCU', v)}
        min={0}
        step={100}
      />

      <InputField
        label="Earnings per CCU (USD)"
        value={inputs.earningsPerCCU}
        onChange={(v) => onUpdate('earningsPerCCU', v)}
        prefix="$"
        min={0}
        step={5}
      />

      <InputField
        label="CCU Decay Rate (% per month)"
        value={inputs.ccuDecayRate}
        onChange={(v) => onUpdate('ccuDecayRate', v)}
        suffix="%"
        min={-100}
        max={100}
        step={1}
      />

      <InputField
        label="CCU Floor (minimum)"
        value={inputs.ccuFloor}
        onChange={(v) => onUpdate('ccuFloor', v)}
        min={0}
        step={50}
      />
    </div>
  );
}
