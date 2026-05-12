import type { Competition } from '../../../types/competition';
import type { LeagueVisibility } from '../../../types/league';

interface StepReviewProps {
  name: string;
  visibility: LeagueVisibility;
  competition: Competition;
}

export function StepReview({ name, visibility, competition }: StepReviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & create</h2>
        <p className="text-gray-600 mt-1">Make sure everything looks right before creating your league.</p>
      </div>

      <div className="border border-gray-200 rounded-xl divide-y divide-gray-200">
        <div className="p-4 flex justify-between items-start gap-4">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="font-semibold text-gray-900 mt-0.5 break-all">{name}</div>
          </div>
        </div>

        <div className="p-4 flex justify-between items-start gap-4">
          <div>
            <div className="text-sm text-gray-500">Visibility</div>
            <div className="font-semibold text-gray-900 mt-0.5">
              {visibility === 'PRIVATE' ? 'Private (invite-only)' : 'Public'}
            </div>
            {visibility === 'PRIVATE' && (
              <div className="text-xs text-gray-500 mt-1">
                We'll generate a join link you can share with friends after you create the league.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <div className="text-sm text-gray-500">Competition</div>
            <div className="flex items-center gap-3 mt-1">
              {competition.logoUrl && (
                <img src={competition.logoUrl} alt="" className="w-8 h-8 object-contain" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">{competition.name}</div>
                <div className="text-sm text-gray-600">Season {competition.seasonYear}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
