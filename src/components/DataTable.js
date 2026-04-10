export default function DataTable({ title, headers, rows }) {
  if (!headers || !rows || rows.length === 0) return null;

  return (
    <div className="my-3 rounded-lg border border-slate-200 overflow-hidden">
      {title && (
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500">{title}</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#1a56db]/20 bg-slate-50">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-left text-xs font-bold text-[#1a56db]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-slate-100 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
              >
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-2.5 text-sm text-slate-700">
                    {row[ci] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
