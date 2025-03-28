import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import "../styles/Compare.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Compare = () => {
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allDates, setAllDates] = useState([]);

  const metrics = [
    { id: "temperature", name: "Temperature", unit: "°C" },
    { id: "humidity", name: "Humidity", unit: "%" },
    { id: "gas_level", name: "Gas Level", unit: "ppm" },
    { id: "pressure", name: "Pressure", unit: "hPa" },
    { id: "altitude", name: "Altitude", unit: "m" },
    { id: "uv_index", name: "UV Index", unit: "" },
  ];

  useEffect(() => {
    const fetchDates = () => {
      const dataRef = ref(db, "sensor_readings");
      onValue(dataRef, (snapshot) => {
        if (snapshot.exists()) {
          const dates = Object.keys(snapshot.val()).map((key) => {
            const timestamp = snapshot.val()[key].timestamp;
            return timestamp.split("_")[0]; // Extract date part
          });
          setAllDates([...new Set(dates)]); // Remove duplicates
        }
      });
    };

    fetchDates();
  }, []);

  const fetchDataForDate = (date) => {
    return new Promise((resolve) => {
      const dataRef = ref(db, "sensor_readings");
      onValue(dataRef, (snapshot) => {
        if (snapshot.exists()) {
          const entries = [];
          snapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val();
            if (entry.timestamp.startsWith(date)) {
              entries.push({
                id: childSnapshot.key,
                ...entry,
                date: parseFirebaseTimestamp(entry.timestamp),
              });
            }
          });
          resolve(entries);
        } else {
          resolve([]);
        }
      });
    });
  };

  const parseFirebaseTimestamp = (timestamp) => {
    const [datePart, timePart] = timestamp.split("_");
    const [year, month, day] = datePart.split("-");
    const [hour, minute, second] = timePart.split("-");
    return new Date(year, month - 1, day, hour, minute, second);
  };

  const handleCompare = async () => {
    if (!date1 || !date2) {
      setError("Please select both dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [firstDateData, secondDateData] = await Promise.all([
        fetchDataForDate(date1),
        fetchDataForDate(date2),
      ]);

      setData1(calculateDailyStats(firstDateData));
      setData2(calculateDailyStats(secondDateData));
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyStats = (data) => {
    if (data.length === 0) return null;

    const stats = {};
    metrics.forEach(({ id }) => {
      const values = data
        .map((item) => item[id])
        .filter((val) => val !== undefined && val !== null);
      if (values.length === 0) return;

      stats[id] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
      };
    });

    return stats;
  };

  const prepareChartData = (metric) => {
    if (!data1 || !data2) return null;

    return {
      labels: ["Date 1", "Date 2"],
      datasets: [
        {
          label: "Average",
          data: [data1[metric].avg, data2[metric].avg],
          backgroundColor: "#4f46e5",
          borderRadius: 4,
        },
        {
          label: "Minimum",
          data: [data1[metric].min, data2[metric].min],
          backgroundColor: "#10b981",
          borderRadius: 4,
        },
        {
          label: "Maximum",
          data: [data1[metric].max, data2[metric].max],
          backgroundColor: "#ef4444",
          borderRadius: 4,
        },
      ],
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getComparisonSummary = (metric) => {
    if (!data1 || !data2) return null;

    const metricInfo = metrics.find((m) => m.id === metric);
    const diff = data2[metric].avg - data1[metric].avg;
    const percentageChange = (diff / data1[metric].avg) * 100;

    let trend = "";
    if (Math.abs(percentageChange) < 5) {
      trend = "remained stable";
    } else if (diff > 0) {
      trend = "increased";
    } else {
      trend = "decreased";
    }

    return (
      <div className="metric-summary">
        <h4>{metricInfo.name}</h4>
        <div className="metric-values">
          <div>
            <span className="date-label">{formatDate(date1)}:</span>
            <span className="metric-value">
              {data1[metric].avg.toFixed(1)}
              {metricInfo.unit}
            </span>
          </div>
          <div>
            <span className="date-label">{formatDate(date2)}:</span>
            <span className="metric-value">
              {data2[metric].avg.toFixed(1)}
              {metricInfo.unit}
            </span>
          </div>
        </div>
        <div className="trend-indicator">
          <span className={`trend-arrow ${diff > 0 ? "up" : "down"}`}>
            {diff > 0 ? "↑" : "↓"}
          </span>
          <span className="trend-text">
            {trend} by {Math.abs(diff).toFixed(1)}
            {metricInfo.unit} ({Math.abs(percentageChange).toFixed(1)}%)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="compare-container">
      <h1 className="compare-header">
        <span className="compare-icon">📊</span> Environmental Data Comparison
      </h1>

      <div className="date-selector-container">
        <div className="date-selector">
          <label htmlFor="date1">First Date:</label>
          <input
            type="date"
            id="date1"
            value={date1}
            onChange={(e) => setDate1(e.target.value)}
            list="availableDates"
          />
        </div>

        <div className="date-selector">
          <label htmlFor="date2">Second Date:</label>
          <input
            type="date"
            id="date2"
            value={date2}
            onChange={(e) => setDate2(e.target.value)}
            list="availableDates"
          />
        </div>

        <datalist id="availableDates">
          {allDates.map((date) => (
            <option key={date} value={date} />
          ))}
        </datalist>

        <button
          className="compare-button"
          onClick={handleCompare}
          disabled={loading}
        >
          {loading ? "Comparing..." : "Compare Dates"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {data1 && data2 && (
        <div className="comparison-results">
          <div className="metrics-summary">
            <h2>Comparison Summary</h2>
            <div className="metrics-grid">
              {metrics.map((metric) => (
                <div key={metric.id} className="metric-card">
                  {getComparisonSummary(metric.id)}
                </div>
              ))}
            </div>
          </div>

          <div className="metrics-charts">
            <h2>Detailed Comparison</h2>
            <div className="charts-grid">
              {metrics.map((metric) => (
                <div key={metric.id} className="chart-card">
                  <h3>{metric.name} Comparison</h3>
                  <div className="chart-container">
                    <Bar
                      data={prepareChartData(metric.id)}
                      options={{
                        responsive: true,
                        plugins: {
                          title: {
                            display: true,
                            text: `${metric.name} (${metric.unit})`,
                          },
                          legend: {
                            position: "bottom",
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: false,
                            title: {
                              display: true,
                              text: metric.unit,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compare;
