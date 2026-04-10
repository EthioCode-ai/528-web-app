"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444"];

export default function QuestionChart({ chartType, title, xLabel, yLabel, datasets }) {
  if (!datasets || datasets.length === 0) return null;

  const firstDataset = datasets[0];
  if (!firstDataset?.data || firstDataset.data.length === 0) return null;

  if (chartType === "bar") {
    return <QBarChart title={title} xLabel={xLabel} yLabel={yLabel} datasets={datasets} />;
  }
  return <QLineChart title={title} xLabel={xLabel} yLabel={yLabel} datasets={datasets} />;
}

function QLineChart({ title, xLabel, yLabel, datasets }) {
  const chartData = datasets[0].data.map((d, i) => {
    const point = { x: d.x };
    datasets.forEach((ds, di) => {
      point[ds.label || `s${di}`] = ds.data[i]?.y ?? 0;
    });
    return point;
  });

  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white p-4">
      {title && <p className="text-xs font-semibold text-slate-500 text-center mb-3">{title}</p>}
      {yLabel && <p className="text-[10px] text-slate-400 mb-1">{yLabel}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            {datasets.map((_, di) => (
              <linearGradient key={di} id={`qGrad${di}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[di % COLORS.length]} stopOpacity={0.2} />
                <stop offset="95%" stopColor={COLORS[di % COLORS.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b", border: "none", borderRadius: 8,
              color: "#f1f5f9", fontSize: 12,
            }}
          />
          {datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />}
          {datasets.map((ds, di) => (
            <Area
              key={di}
              type="monotone"
              dataKey={ds.label || `s${di}`}
              stroke={COLORS[di % COLORS.length]}
              strokeWidth={2}
              fill={`url(#qGrad${di})`}
              dot={{ r: 4, fill: COLORS[di % COLORS.length], stroke: "#fff", strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {xLabel && <p className="text-[10px] text-slate-400 text-center mt-1">{xLabel}</p>}
    </div>
  );
}

function QBarChart({ title, xLabel, yLabel, datasets }) {
  const chartData = datasets[0].data.map((d, i) => {
    const point = { x: d.x };
    datasets.forEach((ds, di) => {
      point[ds.label || `s${di}`] = ds.data[i]?.y ?? 0;
    });
    return point;
  });

  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white p-4">
      {title && <p className="text-xs font-semibold text-slate-500 text-center mb-3">{title}</p>}
      {yLabel && <p className="text-[10px] text-slate-400 mb-1">{yLabel}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f020" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b", border: "none", borderRadius: 8,
              color: "#f1f5f9", fontSize: 12,
            }}
          />
          {datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />}
          {datasets.map((ds, di) => (
            <Bar
              key={di}
              dataKey={ds.label || `s${di}`}
              fill={COLORS[di % COLORS.length]}
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {xLabel && <p className="text-[10px] text-slate-400 text-center mt-1">{xLabel}</p>}
    </div>
  );
}
