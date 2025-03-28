import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import "../styles/View.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ViewTrends = () => {
  const [timeRange, setTimeRange] = useState("week");
  const [metric, setMetric] = useState("temperature");
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const metrics = [
    { id: "temperature", name: "Temperature", unit: "°C" },
    { id: "humidity", name: "Humidity", unit: "%" },
    { id: "gas_level", name: "Gas Level", unit: "ppm" },
    { id: "pressure", name: "Pressure", unit: "hPa" },
    { id: "altitude", name: "Altitude", unit: "m" },
    { id: "uv_index", name: "UV Index", unit: "" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dataRef = ref(db, "sensor_readings");

        onValue(dataRef, (snapshot) => {
          if (snapshot.exists()) {
            const rawData = snapshot.val();
            const dataArray = Object.keys(rawData).map((key) => ({
              id: key,
              ...rawData[key],
              date: parseFirebaseTimestamp(rawData[key].timestamp),
            }));

            const filteredData = filterDataByTimeRange(dataArray, timeRange);
            setData(filteredData);
            calculateStatistics(filteredData);
            setLoading(false);
          } else {
            setData([]);
            setLoading(false);
          }
        });
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const parseFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    const [datePart, timePart] = timestamp.split("_");
    const [year, month, day] = datePart.split("-");
    const [hour, minute, second] = timePart.split("-");
    return new Date(year, month - 1, day, hour, minute, second);
  };

  const filterDataByTimeRange = (dataArray, range) => {
    const now = new Date();
    const cutoffDate = new Date(now);

    if (range === "day") {
      cutoffDate.setDate(now.getDate() - 1);
    } else if (range === "week") {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (range === "month") {
      cutoffDate.setMonth(now.getMonth() - 1);
    }

    return dataArray
      .filter((item) => item.date >= cutoffDate)
      .sort((a, b) => a.date - b.date);
  };

  const calculateStatistics = (data) => {
    if (data.length === 0) return;

    const calculatedStats = {};

    metrics.forEach(({ id }) => {
      const values = data
        .map((item) => item[id])
        .filter((val) => val !== undefined && val !== null);
      if (values.length === 0) return;

      const min = Math.min(...values);
      const max = Math.max(...values);

      calculatedStats[id] = {
        min,
        max,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        minEntry: data.find((item) => item[id] === min),
        maxEntry: data.find((item) => item[id] === max),
        trend: values[values.length - 1] - values[0],
      };
    });

    setStats(calculatedStats);
  };

  const prepareChartData = () => {
    const labels = data.map((item) => {
      if (timeRange === "day") {
        return item.date.toLocaleTimeString([], { hour: "2-digit" });
      }
      return item.date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    });

    const currentMetric = metrics.find((m) => m.id === metric);
    const unit = currentMetric ? currentMetric.unit : "";

    const dataset = {
      label: `${currentMetric.name} (${unit})`,
      data: data.map((item) => item[metric]),
      borderColor: getColorForMetric(metric),
      backgroundColor: `${getColorForMetric(metric)}33`,
      tension: 0.1,
      fill: true,
    };

    return {
      labels,
      datasets: [dataset],
    };
  };

  const getColorForMetric = (metric) => {
    const colors = {
      temperature: "#e74c3c",
      humidity: "#3498db",
      gas_level: "#2ecc71",
      pressure: "#9b59b6",
      altitude: "#f39c12",
      uv_index: "#e67e22",
    };
    return colors[metric] || "#34495e";
  };

  const getTrendAnalysis = () => {
    if (!stats || !stats[metric]) return "Not enough data to determine trend";

    const metricInfo = metrics.find((m) => m.id === metric);
    const { min, max, avg, trend } = stats[metric];
    const percentageChange = (trend / (avg - trend)) * 100;

    let trendDirection = "";
    if (Math.abs(percentageChange) < 5) {
      trendDirection = "remained relatively stable";
    } else if (trend > 0) {
      trendDirection = "has been increasing";
    } else {
      trendDirection = "has been decreasing";
    }

    return (
      <div className="analysis-details">
        <div className="analysis-row">
          <span className="analysis-label">Highest recorded:</span>
          <span className="analysis-value">
            {max.toFixed(1)}
            {metricInfo.unit}
          </span>
        </div>
        <div className="analysis-row">
          <span className="analysis-label">Lowest recorded:</span>
          <span className="analysis-value">
            {min.toFixed(1)}
            {metricInfo.unit}
          </span>
        </div>
        <div className="analysis-row">
          <span className="analysis-label">Average value:</span>
          <span className="analysis-value">
            {avg.toFixed(1)}
            {metricInfo.unit}
          </span>
        </div>
        <div className="trend-direction">
          The {metricInfo.name.toLowerCase()} {trendDirection} by{" "}
          {Math.abs(trend).toFixed(1)}
          {metricInfo.unit}({Math.abs(percentageChange).toFixed(1)}%) during
          this period.
        </div>
        <div className="metric-context">{getMetricContext(metric, avg)}</div>
      </div>
    );
  };

  const getMetricContext = (metric, avg) => {
    const contexts = {
      temperature: () => {
        if (avg > 30)
          return "This is considered very hot. Take precautions against heat exposure.";
        if (avg > 25) return "Warm conditions. Stay hydrated.";
        if (avg < 10) return "Cold conditions. Dress appropriately.";
        if (avg < 18) return "Cool conditions. Light jacket recommended.";
        return "Comfortable temperature range.";
      },
      humidity: () => {
        if (avg > 70)
          return "High humidity may cause discomfort. Good for plants.";
        if (avg < 30)
          return "Low humidity may cause dry skin. Consider a humidifier.";
        return "Comfortable humidity level.";
      },
      gas_level: () => {
        if (avg > 50)
          return "⚠️ Warning: High gas levels detected. Ventilate area immediately.";
        if (avg > 30) return "Elevated gas levels. Monitor closely.";
        return "Normal gas levels detected.";
      },
      pressure: () => {
        if (avg > 1020)
          return "High pressure typically indicates stable weather.";
        if (avg < 1000)
          return "Low pressure often associated with stormy weather.";
        return "Normal pressure range.";
      },
      altitude: () => {
        if (avg > 1500)
          return "High altitude location. Be aware of potential altitude effects.";
        return "Moderate altitude.";
      },
      uv_index: () => {
        if (avg > 8)
          return "⚠️ Extreme UV exposure. Avoid sun between 10am-4pm.";
        if (avg > 6) return "High UV index. Use SPF 30+ sunscreen.";
        if (avg > 3) return "Moderate UV exposure. Sun protection recommended.";
        return "Low UV exposure. Minimal protection needed.";
      },
    };

    return contexts[metric] ? contexts[metric]() : "";
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="view-container">
      <h1 className="view-header">Environmental Trends Analysis</h1>

      <div className="time-filter">
        <button
          className={timeRange === "day" ? "active" : ""}
          onClick={() => setTimeRange("day")}
        >
          24 Hours
        </button>
        <button
          className={timeRange === "week" ? "active" : ""}
          onClick={() => setTimeRange("week")}
        >
          7 Days
        </button>
        <button
          className={timeRange === "month" ? "active" : ""}
          onClick={() => setTimeRange("month")}
        >
          30 Days
        </button>
      </div>

      <div className="metric-selector">
        <select value={metric} onChange={(e) => setMetric(e.target.value)}>
          {metrics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading data...</div>
      ) : (
        <>
          <div className="chart-container">
            <Line
              data={prepareChartData()}
              options={{
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: `${metrics.find((m) => m.id === metric).name} Trend`,
                  },
                },
                scales: {
                  y: {
                    title: {
                      display: true,
                      text: metrics.find((m) => m.id === metric).unit,
                    },
                  },
                },
              }}
            />
          </div>

          <div className="trend-analysis">
            <h3>Detailed Analysis</h3>
            {getTrendAnalysis()}
          </div>

          <div className="summary-cards">
            {metrics
              .filter((m) => m.id !== metric)
              .map((m) => (
                <div
                  key={m.id}
                  className="summary-card"
                  style={{ borderColor: getColorForMetric(m.id) }}
                >
                  <h4>{m.name}</h4>
                  {stats && stats[m.id] ? (
                    <>
                      <div className="summary-value">
                        {stats[m.id].avg.toFixed(1)}
                        {m.unit}
                      </div>
                      <div className="summary-range">
                        {stats[m.id].min.toFixed(1)} -{" "}
                        {stats[m.id].max.toFixed(1)}
                        {m.unit}
                      </div>
                    </>
                  ) : (
                    <div className="summary-value">No data</div>
                  )}
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ViewTrends;
