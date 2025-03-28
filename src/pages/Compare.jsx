import React, { useState, useEffect } from "react";
import { ref, query, orderByChild, onValue } from "firebase/database";
import { db } from "../firebase";
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
  const [metrics] = useState([
    { id: "temperature", name: "Temperature", unit: "°C" },
    { id: "humidity", name: "Humidity", unit: "%" },
    { id: "gas_level", name: "Gas Level", unit: "ppm" },
    { id: "pressure", name: "Pressure", unit: "hPa" },
    { id: "altitude", name: "Altitude", unit: "m" },
    { id: "uv_index", name: "UV Index", unit: "" },
  ]);

  const fetchDataForDate = async (date, setDataFunction) => {
    if (!date) return;

    setLoading(true);
    try {
      const dateRef = ref(db, "sensor_readings");
      const dateQuery = query(dateRef, orderByChild("timestamp"));

      onValue(dateQuery, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const formattedData = [];
          const selectedDate = new Date(date);
          selectedDate.setHours(0, 0, 0, 0);
          const nextDay = new Date(selectedDate);
          nextDay.setDate(selectedDate.getDate() + 1);

          Object.keys(data).forEach((key) => {
            const entry = data[key];
            const entryDate = new Date(entry.timestamp);
            if (entryDate >= selectedDate && entryDate < nextDay) {
              formattedData.push({
                id: key,
                ...entry,
                date: entryDate,
              });
            }
          });

          if (formattedData.length > 0) {
            const averages = {};
            metrics.forEach((metric) => {
              const values = formattedData
                .map((item) => item[metric.id])
                .filter((val) => val !== undefined);
              if (values.length > 0) {
                averages[metric.id] =
                  values.reduce((a, b) => a + b, 0) / values.length;
              }
            });

            setDataFunction({
              rawData: formattedData,
              averages,
              date: date,
            });
          } else {
            setDataFunction(null);
            setError(`No data available for ${date}`);
          }
        } else {
          setDataFunction(null);
          setError("No data available in database");
        }
        setLoading(false);
      });
    } catch (err) {
      setError("Failed to fetch data: " + err.message);
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!date1 || !date2) {
      setError("Please select both dates");
      return;
    }
    if (date1 === date2) {
      setError("Please select different dates");
      return;
    }
    setError(null);

    // Fetch data for both dates
    await Promise.all([
      fetchDataForDate(date1, setData1),
      fetchDataForDate(date2, setData2),
    ]);
  };

  const prepareComparisonChartData = () => {
    if (!data1 || !data2) return null;

    const labels = metrics.map((metric) => metric.name);
    const date1Data = metrics.map((metric) => data1.averages[metric.id] || 0);
    const date2Data = metrics.map((metric) => data2.averages[metric.id] || 0);

    return {
      labels,
      datasets: [
        {
          label: date1,
          data: date1Data,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: date2,
          data: date2Data,
          backgroundColor: "rgba(255, 99, 132, 0.6)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  // ... rest of the component code remains the same ...

  return (
    <div className="compare-container">
      <h1 className="compare-header">Compare Environmental Data</h1>

      <div className="date-selectors">
        <div className="date-selector">
          <label>First Date:</label>
          <input
            type="date"
            value={date1}
            onChange={(e) => setDate1(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="date-selector">
          <label>Second Date:</label>
          <input
            type="date"
            value={date2}
            onChange={(e) => setDate2(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <button
          className="compare-button"
          onClick={handleCompare}
          disabled={loading}
        >
          {loading ? "Comparing..." : "Compare Dates"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading-indicator">Loading data...</div>}

      {data1 && data2 && (
        <div className="comparison-results">
          <div className="chart-container">
            <h3>Comparison Overview</h3>
            {prepareComparisonChartData() && (
              <Bar
                data={prepareComparisonChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: `Comparison between ${date1} and ${date2}`,
                    },
                    legend: {
                      position: "top",
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                    },
                  },
                }}
              />
            )}
          </div>

          {/* ... rest of the JSX remains the same ... */}
        </div>
      )}

      {(!data1 || !data2) && !loading && !error && (
        <div className="no-data-message">
          Select two different dates and click "Compare Dates" to view
          comparison
        </div>
      )}
    </div>
  );
};

export default Compare;
