import { Input } from '../../ui/Input';

interface StepNameProps {
  name: string;
  onChange: (value: string) => void;
  error?: string;
}

export function StepName({ name, onChange, error }: StepNameProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Name your league</h2>
        <p className="text-gray-600 mt-1">
          Give your league a memorable name. You can't change it later.
        </p>
      </div>
      <Input
        label="League name"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Friends World Cup Pool"
        maxLength={100}
        error={error}
        autoFocus
      />
      <div className="text-xs text-gray-500 flex justify-end">{name.length}/100</div>
    </div>
  );
}
