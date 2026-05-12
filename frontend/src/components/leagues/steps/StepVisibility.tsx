import { Check, Globe, Lock } from 'lucide-react';
import type { LeagueVisibility } from '../../../types/league';

interface StepVisibilityProps {
  visibility: LeagueVisibility | null;
  onChange: (value: LeagueVisibility) => void;
}

const options: Array<{
  value: LeagueVisibility;
  title: string;
  description: string;
  icon: typeof Globe;
}> = [
  {
    value: 'PUBLIC',
    title: 'Public',
    description: 'Anyone can discover and join your league.',
    icon: Globe,
  },
  {
    value: 'PRIVATE',
    title: 'Private (invite-only)',
    description: 'Share a unique join link with people you want to invite.',
    icon: Lock,
  },
];

export function StepVisibility({ visibility, onChange }: StepVisibilityProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Who can join?</h2>
        <p className="text-gray-600 mt-1">
          Choose how people find and join your league.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = visibility === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`relative text-left p-6 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="font-semibold text-gray-900 mb-1">{option.title}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
