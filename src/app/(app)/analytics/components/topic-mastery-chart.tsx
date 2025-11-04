import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TopicMastery = {
  topic: string;
  mastered: number;
  inProgress: number;
  needsReview: number;
};

export default function TopicMasteryChart({ data }: { data: TopicMastery[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" barSize={20} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
        <YAxis type="category" dataKey="topic" width={80} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} tickLine={false} axisLine={false}/>
        <Tooltip content={<TopicMasteryTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
        <Bar
          dataKey="mastered"
          stackId="stack"
          fill="hsl(var(--chart-2))"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="inProgress"
          stackId="stack"
          fill="hsl(var(--chart-4))"
        />
        <Bar
          dataKey="needsReview"
          stackId="stack"
          fill="hsl(var(--destructive))"
          radius={[4, 0, 0, 4]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopicMasteryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-card p-3 border rounded-lg shadow-lg">
      <p className="font-medium text-sm mb-2">{label}</p>
      <div className="flex flex-col gap-1.5">
        {payload.reverse().map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-card-foreground">
              {entry.name === 'inProgress' ? 'In Progress' : entry.name === 'needsReview' ? 'Needs Review' : 'Mastered'}: {entry.value.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
