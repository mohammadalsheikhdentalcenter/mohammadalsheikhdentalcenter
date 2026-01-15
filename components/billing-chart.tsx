// @ts-nocheck
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { DollarSign, PieChartIcon } from "lucide-react"

export function BillingChart({ stats }: any) {
  const data =
    stats.totalDebt > 0
      ? [
          { name: "Paid", value: Number(stats.totalPaid.toFixed(2)) },
          { name: "Remaining", value: Number(stats.remainingBalance.toFixed(2)) },
        ]
      : [{ name: "Total Paid", value: Number(stats.totalPaid.toFixed(2)) }]

  const COLORS = stats.totalDebt > 0 ? ["#10b981", "#e5e7eb"] : ["#10b981"]

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[140px] max-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
            <span className="text-sm font-medium text-foreground truncate">{payload[0].name}</span>
          </div>
          <div className="text-base font-bold text-foreground truncate">${payload[0].value.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {stats.totalDebt > 0 ? `${((payload[0].value / stats.totalDebt) * 100).toFixed(1)}% of total` : "No debt"}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">Financial Overview</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">Payment and balance breakdown</p>
        </div>
      </div>

      {stats.totalDebt > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Pie Chart */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 0, right: 0, bottom: 30, left: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="transparent"
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index]}
                      className="transition-opacity duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    overflow: "hidden",
                  }}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground whitespace-nowrap truncate">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-[80%] px-4">
                <div className="text-xs text-muted-foreground font-semibold  truncate">Total Debt</div>
                <div className="text-sm font-bold text-foreground truncate">${stats.totalDebt.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Stats Breakdown */}
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/20 rounded-lg p-4 border border-border min-w-0">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] flex-shrink-0"></div>
                  <span className="text-sm font-medium text-foreground truncate">Paid</span>
                </div>
                <div className="text-xl font-bold text-accent truncate">${stats.totalPaid.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {stats.totalDebt > 0 ? `${((stats.totalPaid / stats.totalDebt) * 100).toFixed(1)}%` : "100%"}
                </div>
              </div>

              <div className="bg-muted/20 rounded-lg p-4 border border-border min-w-0">
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#e5e7eb] flex-shrink-0"></div>
                  <span className="text-sm font-medium text-foreground truncate">Remaining</span>
                </div>
                <div
                  className={`text-xl font-bold truncate ${
                    stats.remainingBalance > 0 ? "text-destructive" : "text-accent"
                  }`}
                >
                  ${stats.remainingBalance.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {stats.totalDebt > 0
                    ? `${((Math.abs(stats.remainingBalance) / stats.totalDebt) * 100).toFixed(1)}%`
                    : "0%"}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-2 min-w-0 gap-2">
                <span className="text-muted-foreground truncate flex-shrink-0">Payment Progress</span>
                <span className="font-medium text-foreground truncate">
                  {stats.totalDebt > 0 ? `${((stats.totalPaid / stats.totalDebt) * 100).toFixed(0)}%` : "100%"}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${stats.totalDebt > 0 ? Math.min(100, (stats.totalPaid / stats.totalDebt) * 100) : 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {stats.totalPaid > 0 ? (
            <>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2 truncate px-4">Payment Recorded</h4>
              <p className="text-muted-foreground max-w-sm px-4 mb-4">
                Total Paid: <span className="font-bold text-accent">${stats.totalPaid.toFixed(2)}</span>
              </p>
              <p className="text-sm text-muted-foreground max-w-sm px-4">
                No outstanding balance. Patient has paid without creating debt.
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2 truncate px-4">No Billing Data</h4>
              <p className="text-muted-foreground max-w-sm px-4">
                No billing information available. Add a debt to get started.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
