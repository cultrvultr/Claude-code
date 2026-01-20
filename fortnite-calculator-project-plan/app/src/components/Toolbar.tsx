import { useState } from 'react';
import type { CalculatorInputs, BrandDeal, CalculatorResults } from '../types/calculator';
import {
  downloadCSV,
  getShareableURL,
  getSavedScenarios,
  saveScenario,
  deleteScenario,
  type SavedScenario,
  type ShareableState,
} from '../utils/export';

interface ToolbarProps {
  inputs: CalculatorInputs;
  brandDeals: BrandDeal[];
  results: CalculatorResults;
  onLoadScenario: (state: ShareableState) => void;
}

export function Toolbar({ inputs, brandDeals, results, onLoadScenario }: ToolbarProps) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [shareURL, setShareURL] = useState('');
  const [copied, setCopied] = useState(false);

  const handleExportCSV = () => {
    downloadCSV(inputs, brandDeals, results);
  };

  const handleOpenSave = () => {
    setSaveName(`Scenario ${new Date().toLocaleDateString()}`);
    setShowSaveModal(true);
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveScenario(saveName, { inputs, brandDeals });
    setShowSaveModal(false);
    setSaveName('');
  };

  const handleOpenLoad = () => {
    setScenarios(getSavedScenarios());
    setShowLoadModal(true);
  };

  const handleLoad = (scenario: SavedScenario) => {
    onLoadScenario(scenario.state);
    setShowLoadModal(false);
  };

  const handleDelete = (id: string) => {
    deleteScenario(id);
    setScenarios(getSavedScenarios());
  };

  const handleShare = () => {
    const url = getShareableURL({ inputs, brandDeals });
    setShareURL(url);
    setShowShareModal(true);
    setCopied(false);
  };

  const handleCopyURL = async () => {
    await navigator.clipboard.writeText(shareURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleExportCSV}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </button>

      <button
        onClick={handleOpenSave}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Save
      </button>

      <button
        onClick={handleOpenLoad}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Load
      </button>

      <button
        onClick={handleShare}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Save Scenario</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter scenario name"
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg mb-4 focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLoadModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Load Scenario</h3>
            {scenarios.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No saved scenarios yet</p>
            ) : (
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{scenario.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(scenario.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoad(scenario)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(scenario.id)}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-sm rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Share Calculator</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Copy this URL to share your current calculator settings:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareURL}
                readOnly
                className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={handleCopyURL}
                className={`px-4 py-2 rounded-lg transition font-medium ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
