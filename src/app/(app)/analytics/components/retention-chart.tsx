import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type RetentionData = {
  date: string;
  retentionRate: number;
  target: number;
};

export default function RetentionChart({ data }: { data: RetentionData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip content={<RetentionTooltip />} />
        <Line
          type="monotone"
          dataKey="retentionRate"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function RetentionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-card p-3 border rounded-lg shadow-lg">
      <p className="font-medium text-sm mb-1">{label}</p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-card-foreground">
              {entry.name === 'retentionRate' ? 'Retention Rate' : 'Target'}: {entry.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
