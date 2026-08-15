import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getCurrencySymbol } from "@/lib/currency";

interface PriceHistoryData {
  id: string;
  price: string;
  createdAt: string;
  source?: string;
}

interface PriceHistoryChartProps {
  data: PriceHistoryData[];
  currency?: string;
}

interface PriceChartPoint {
  date: string;
  price: number;
  fullDate: string;
}

interface PriceHistoryTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: unknown;
    value?: unknown;
  }>;
  currency: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatPrice = (value: number, currency: string): string => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${value.toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
};

function PriceHistoryTooltip({
  active,
  payload,
  currency,
}: PriceHistoryTooltipProps) {
  const tooltipEntry = payload?.[0];
  const chartPoint = tooltipEntry?.payload as PriceChartPoint | undefined;
  const price = Number(tooltipEntry?.value);

  if (!active || !chartPoint || !Number.isFinite(price)) {
    return null;
  }

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="text-sm text-muted-foreground">{chartPoint.fullDate}</p>
      <p className="text-lg font-bold text-primary">
        {formatPrice(price, currency)}
      </p>
    </div>
  );
}

export default function PriceHistoryChart({
  data,
  currency = "INR",
}: PriceHistoryChartProps) {
  // Early return for empty or invalid data
  if (!data || data.length === 0) {
    return null;
  }

  // Transform data for the chart
  const chartData: PriceChartPoint[] = data
    .map((item) => ({
      date: formatDate(item.createdAt),
      price: parseFloat(item.price),
      fullDate: new Date(item.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }))
    .filter((item) => !isNaN(item.price))
    .sort(
      (a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime(),
    );

  // Return null if no valid data after filtering
  if (chartData.length === 0) {
    return null;
  }

  // Calculate min and max for Y axis with padding
  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1 || maxPrice * 0.1;

  // Calculate if price went up or down
  const firstPrice = chartData[0]?.price || 0;
  const lastPrice = chartData[chartData.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent =
    firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : 0;

  if (chartData.length < 2) {
    return (
      <div className="bg-secondary/50 rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Not enough price data to show a chart.
        </p>
        {chartData[0] && (
          <p className="mt-2 font-medium">
            Current price: {formatPrice(chartData[0].price, currency)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 rounded-xl p-4">
      {/* Price change indicator */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Price trend</p>
          <p className="text-2xl font-bold">
            {formatPrice(lastPrice, currency)}
          </p>
        </div>
        {priceChange !== 0 && (
          <div
            className={`text-right ${
              priceChange < 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            <p className="text-sm font-medium">
              {priceChange < 0 ? "↓" : "↑"}{" "}
              {formatPrice(Math.abs(priceChange), currency)}
            </p>
            <p className="text-xs">
              {priceChange < 0 ? "" : "+"}
              {priceChangePercent}% since first tracked
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatPrice(value, currency)}
              width={80}
            />
            <Tooltip
              content={({ active, payload }) => (
                <PriceHistoryTooltip
                  active={active}
                  payload={payload}
                  currency={currency}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        {chartData.length} price points tracked
      </p>
    </div>
  );
}
