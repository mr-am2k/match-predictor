import { Info } from 'lucide-react';

const rules = [
  { points: 1, description: 'Correct winner or draw' },
  { points: 2, description: 'Exact score (in addition to the winner point)' },
  { points: 3, description: 'Each correct goalscorer (up to 3 per match)' },
  { points: 3, description: 'Each correct assister (up to 3 per match)' },
];

export function StepScoringPreview() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Scoring system</h2>
        <p className="text-gray-600 mt-1">
          Here's how points are awarded in your league. This applies to every league.
        </p>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          The scoring system is fixed for now. We may let league owners customize it in a future update.
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Match predictions</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {rules.map((rule, index) => (
            <div
              key={rule.description}
              className={`flex items-center justify-between p-4 ${
                index < rules.length - 1 ? 'border-b border-gray-200' : ''
              }`}
            >
              <span className="text-gray-700">{rule.description}</span>
              <span className="font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                {rule.points} {rule.points === 1 ? 'pt' : 'pts'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
