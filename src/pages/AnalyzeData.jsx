import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Alert, Spin } from "antd";
import styles from "../styles/AnalyzeData.module.css";

const AnalyzeData = () => {
  const [rawData, setRawData] = useState(null);
  const [processedData, setProcessedData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [viewMode, setViewMode] = useState("overall");

  // Define all attributes with their properties
  const attributes = [
    {
      id: "temperature",
      name: "Temperature",
      unit: "°C",
      highThreshold: 30,
      lowThreshold: 10,
      color: "#3b82f6",
    },
    {
      id: "humidity",
      name: "Humidity",
      unit: "%",
      highThreshold: 70,
      lowThreshold: 30,
      color: "#10b981",
    },
    {
      id: "gas_level",
      name: "Gas Level",
      unit: "ppm",
      highThreshold: 500,
      color: "#8b5cf6",
    },
    {
      id: "pressure",
      name: "Pressure",
      unit: "hPa",
      highThreshold: 1020,
      lowThreshold: 980,
      color: "#f59e0b",
    },
    {
      id: "altitude",
      name: "Altitude",
      unit: "m",
      highThreshold: 1500,
      color: "#6366f1",
    },
    {
      id: "uv_index",
      name: "UV Index",
      unit: "",
      highThreshold: 8,
      color: "#ec4899",
    },
  ];

  useEffect(() => {
    const dataRef = ref(db, "sensor_readings");
    setIsLoading(true);

    const unsubscribe = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRawData(data);
        processData(data);
      } else {
        setRawData(null);
        setProcessedData([]);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const parseFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();

    if (typeof timestamp === "number") {
      return new Date(timestamp);
    }

    const [datePart, timePart] = timestamp.split("_");
    const [year, month, day] = datePart.split("-");
    const [hours, minutes, seconds] = timePart.split("-");

    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  };

  const processData = (data) => {
    const dataArray = Object.keys(data).map((key) => {
      const item = data[key];
      return {
        id: key,
        timestamp: parseFirebaseTimestamp(item.timestamp || key),
        ...attributes.reduce((acc, attr) => {
          acc[attr.id] = parseFloat(item[attr.id]) || 0;
          return acc;
        }, {}),
      };
    });

    dataArray.sort((a, b) => a.timestamp - b.timestamp);

    const newAlerts = [];
    const latestReading = dataArray[dataArray.length - 1];

    // Generate alerts for each attribute
    attributes.forEach((attr) => {
      const value = latestReading[attr.id];
      if (attr.highThreshold && value > attr.highThreshold) {
        newAlerts.push({
          type:
            attr.id === "gas_level" || attr.id === "uv_index"
              ? "error"
              : "warning",
          message: `High ${attr.name} ${
            attr.id === "uv_index" ? "" : "Warning"
          }: ${value}${attr.unit}`,
          attribute: attr.id,
        });
      }
      if (attr.lowThreshold && value < attr.lowThreshold) {
        newAlerts.push({
          type: "warning",
          message: `Low ${attr.name} Warning: ${value}${attr.unit}`,
          attribute: attr.id,
        });
      }
    });

    setAlerts(newAlerts);
    setProcessedData(dataArray);
  };

  const filterDataByDate = (data) => {
    if (!startDate || !endDate) return data;

    return data.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const calculateStatistics = (data) => {
    if (data.length === 0) return null;

    const stats = {};
    attributes.forEach((attr) => {
      const values = data
        .map((d) => d[attr.id])
        .filter((val) => val !== undefined);
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        stats[attr.id] = {
          avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          median:
            sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)],
        };
      }
    });

    return {
      ...stats,
      readings: data.length,
      period:
        startDate && endDate
          ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
          : "All time",
    };
  };

  const filteredData = filterDataByDate(processedData);
  const stats = calculateStatistics(filteredData);

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDisplayTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatChartTick = (timestamp) => {
    const date = new Date(timestamp);
    if (viewMode === "daily") {
      return formatDisplayDate(date);
    }
    return formatDisplayTime(date);
  };

  const formatTooltipLabel = (timestamp) => {
    const date = new Date(timestamp);
    return `${formatDisplayDate(date)} at ${formatDisplayTime(date)}`;
  };

  const groupByDay = (data) => {
    const dailyMap = {};

    data.forEach((item) => {
      const dateKey = item.timestamp.toLocaleDateString();
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          displayDate: formatDisplayDate(item.timestamp),
          ...attributes.reduce((acc, attr) => {
            acc[attr.id] = [];
            return acc;
          }, {}),
        };
      }
      attributes.forEach((attr) => {
        dailyMap[dateKey][attr.id].push(item[attr.id]);
      });
    });

    return Object.values(dailyMap).map((day) => ({
      date: day.date,
      displayDate: day.displayDate,
      ...attributes.reduce((acc, attr) => {
        acc[`${attr.id}_avg`] =
          day[attr.id].reduce((a, b) => a + b, 0) / day[attr.id].length;
        acc[`${attr.id}_max`] = Math.max(...day[attr.id]);
        acc[`${attr.id}_min`] = Math.min(...day[attr.id]);
        return acc;
      }, {}),
    }));
  };

  const dailyData = groupByDay(filteredData);

  const formatTooltipValue = (value, name) => {
    const attr = attributes.find((a) => name.includes(a.name));
    if (attr) {
      return [`${value}${attr.unit}`, name];
    }
    return [value, name];
  };

  const getTrendStatus = (value, attr) => {
    if (attr.highThreshold && value > attr.highThreshold) return "high";
    if (attr.lowThreshold && value < attr.lowThreshold) return "low";
    return "normal";
  };

  const getAttributeInsight = (attr, stats) => {
    const stat = stats[attr.id];
    if (!stat) return "";

    let insight = `The average ${attr.name.toLowerCase()} was ${stat.avg.toFixed(
      1
    )}${attr.unit}. `;

    if (attr.highThreshold && stat.avg > attr.highThreshold) {
      insight += `This is considered high${
        attr.id === "uv_index" ? " UV exposure" : ""
      }. `;
      if (attr.id === "gas_level")
        insight += "⚠️ Warning: Poor air quality detected. ";
      if (attr.id === "uv_index") insight += "Use sun protection. ";
    } else if (attr.lowThreshold && stat.avg < attr.lowThreshold) {
      insight += `This is considered low. `;
      if (attr.id === "pressure") insight += "May indicate stormy weather. ";
    } else {
      insight += `This is within normal range. `;
    }

    return insight;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>📊 Weather Data Analytics Dashboard</h1>

      {alerts.length > 0 && (
        <div className={styles.alertContainer}>
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              message={alert.message}
              type={alert.type}
              showIcon
              closable
              className={styles.alert}
            />
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.controlsInner}>
          <div className={styles.viewToggle}>
            <button
              onClick={() => setViewMode("overall")}
              className={
                viewMode === "overall"
                  ? styles.viewButtonActive
                  : styles.viewButtonInactive
              }
            >
              Overall Analysis
            </button>
            <button
              onClick={() => setViewMode("daily")}
              className={
                viewMode === "daily"
                  ? styles.viewButtonActive
                  : styles.viewButtonInactive
              }
            >
              Daily Trends
            </button>
          </div>

          <div className={styles.dateFilter}>
            <span className={styles.dateFilterLabel}>Date Range:</span>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              isClearable={true}
              className={styles.datePicker}
              placeholderText="Select date range"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {stats && (
            <div className={styles.statsGrid}>
              {attributes.map(
                (attr) =>
                  stats[attr.id] && (
                    <StatCard
                      key={attr.id}
                      title={attr.name}
                      value={`${stats[attr.id].avg.toFixed(1)}${attr.unit}`}
                      description={`Range: ${stats[attr.id].min.toFixed(
                        1
                      )} - ${stats[attr.id].max.toFixed(1)}${attr.unit}`}
                      trend={getTrendStatus(stats[attr.id].avg, attr)}
                      icon={
                        attr.id === "temperature"
                          ? "🌡️"
                          : attr.id === "humidity"
                          ? "💧"
                          : attr.id === "gas_level"
                          ? "🔥"
                          : attr.id === "pressure"
                          ? "⏱️"
                          : attr.id === "altitude"
                          ? "⛰️"
                          : "☀️"
                      }
                    />
                  )
              )}
              <StatCard
                title="Readings Analyzed"
                value={stats.readings}
                description={`Period: ${stats.period}`}
                icon="📊"
              />
            </div>
          )}

          <div className={styles.chartSection}>
            <h2 className={styles.sectionTitle}>
              {viewMode === "overall" ? "Sensor Data Trends" : "Daily Averages"}
            </h2>

            {viewMode === "overall" ? (
              <div className={styles.chartsGrid}>
                {attributes.map((attr) => (
                  <ChartContainer
                    key={attr.id}
                    title={`${attr.name} Trend (${attr.unit})`}
                  >
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatChartTick}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={formatTooltipLabel}
                          formatter={formatTooltipValue}
                        />
                        <Legend />
                        {attr.highThreshold && (
                          <ReferenceLine
                            y={attr.highThreshold}
                            label="Warning"
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey={attr.id}
                          name={attr.name}
                          stroke={attr.color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ))}
              </div>
            ) : (
              <div className={styles.chartsGrid}>
                {attributes.map((attr) => (
                  <ChartContainer
                    key={attr.id}
                    title={`Daily ${attr.name} (${attr.unit})`}
                  >
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayDate" />
                        <YAxis />
                        <Tooltip formatter={formatTooltipValue} />
                        <Legend />
                        <Bar
                          dataKey={`${attr.id}_avg`}
                          name={`Avg ${attr.name}`}
                          fill={attr.color}
                        />
                        <Bar
                          dataKey={`${attr.id}_max`}
                          name={`Max ${attr.name}`}
                          fill={`${attr.color}80`}
                        />
                        {attr.id !== "uv_index" && (
                          <Bar
                            dataKey={`${attr.id}_min`}
                            name={`Min ${attr.name}`}
                            fill={`${attr.color}40`}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ))}
              </div>
            )}
          </div>

          {stats && (
            <div className={styles.insightsSection}>
              <h2 className={styles.sectionTitle}>📈 Data Analysis Insights</h2>

              <div className={styles.insightsContent}>
                {attributes.map(
                  (attr) =>
                    stats[attr.id] && (
                      <p key={attr.id}>
                        <strong>{attr.name} Analysis:</strong>{" "}
                        {getAttributeInsight(attr, stats)}
                      </p>
                    )
                )}
                <p>
                  <strong>Data Summary:</strong> Analyzed {stats.readings}{" "}
                  readings
                  {startDate && endDate
                    ? ` between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`
                    : " across all available data"}
                  .
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, description, trend, icon }) => {
  const trendColors = {
    high: `${styles.statCard} ${styles.statCardHigh}`,
    low: `${styles.statCard} ${styles.statCardLow}`,
    normal: `${styles.statCard} ${styles.statCardNormal}`,
  };

  return (
    <div className={trendColors[trend] || styles.statCard}>
      <div className={styles.statCardHeader}>
        <h3 className={styles.statCardTitle}>{title}</h3>
        <span className={styles.statCardIcon}>{icon}</span>
      </div>
      <p className={styles.statCardValue}>{value}</p>
      <p className={styles.statCardDescription}>{description}</p>
    </div>
  );
};

const ChartContainer = ({ title, children }) => {
  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {children}
    </div>
  );
};

export default AnalyzeData;
