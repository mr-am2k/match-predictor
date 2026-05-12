import { LeagueCreationWizard } from '../components/leagues/LeagueCreationWizard';

export function CreateLeaguePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create a new league</h1>
          <p className="text-gray-600 mt-1">
            A private prediction contest you can run with friends or make open to anyone.
          </p>
        </div>
        <LeagueCreationWizard />
      </div>
    </div>
  );
}
