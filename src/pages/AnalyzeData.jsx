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
  ReferenceLine
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Alert, Spin } from "antd";
import styles from '../styles/AnalyzeData.module.css';

const AnalyzeData = () => {
  const [rawData, setRawData] = useState(null);
  const [processedData, setProcessedData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [viewMode, setViewMode] = useState("overall");

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

  // Parse Firebase timestamp format "YYYY-MM-DD_HH-mm-ss"
  const parseFirebaseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    
    // Handle both formats: timestamp string or epoch time
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // Parse "2025-03-01_10-04-18" format
    const [datePart, timePart] = timestamp.split('_');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes, seconds] = timePart.split('-');
    
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Months are 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  };

  const processData = (data) => {
    const dataArray = Object.keys(data).map(key => {
      const item = data[key];
      return {
        id: key,
        timestamp: parseFirebaseTimestamp(item.timestamp || key),
        temperature: parseFloat(item.temperature) || 0,
        humidity: parseFloat(item.humidity) || 0,
        altitude: parseFloat(item.altitude) || 0,
        gasLevel: parseFloat(item.gasLevel) || 0,
      };
    });

    // Sort by timestamp
    dataArray.sort((a, b) => a.timestamp - b.timestamp);

    // Analyze for alerts
    const newAlerts = [];
    const latestReading = dataArray[dataArray.length - 1];

    if (latestReading.temperature > 30) {
      newAlerts.push({
        type: "warning",
        message: `High Temperature Warning: ${latestReading.temperature}°C`,
      });
    } else if (latestReading.temperature < 10) {
      newAlerts.push({
        type: "warning",
        message: `Low Temperature Warning: ${latestReading.temperature}°C`,
      });
    }

    if (latestReading.humidity > 70) {
      newAlerts.push({
        type: "warning",
        message: `High Humidity Warning: ${latestReading.humidity}%`,
      });
    } else if (latestReading.humidity < 30) {
      newAlerts.push({
        type: "warning",
        message: `Low Humidity Warning: ${latestReading.humidity}%`,
      });
    }

    if (latestReading.gasLevel > 500) {
      newAlerts.push({
        type: "error",
        message: `Dangerous Gas Levels Detected: ${latestReading.gasLevel} ppm`,
      });
    }

    setAlerts(newAlerts);
    setProcessedData(dataArray);
  };

  const filterDataByDate = (data) => {
    if (!startDate || !endDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const calculateStatistics = (data) => {
    if (data.length === 0) return null;
    
    const tempValues = data.map(d => d.temperature);
    const humidityValues = data.map(d => d.humidity);
    const gasValues = data.map(d => d.gasLevel);
    
    const calculateStats = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 
        : sorted[Math.floor(sorted.length/2)];
      
      return { avg, min, max, median };
    };
    
    return {
      temperature: calculateStats(tempValues),
      humidity: calculateStats(humidityValues),
      gasLevel: calculateStats(gasValues),
      readings: data.length,
      period: startDate && endDate 
        ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
        : "All time"
    };
  };

  const filteredData = filterDataByDate(processedData);
  const stats = calculateStatistics(filteredData);

  // Format date for display
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatDisplayTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format X-axis tick for charts
  const formatChartTick = (timestamp) => {
    const date = new Date(timestamp);
    if (viewMode === "daily") {
      return formatDisplayDate(date);
    }
    return formatDisplayTime(date);
  };

  // Format tooltip date/time
  const formatTooltipLabel = (timestamp) => {
    const date = new Date(timestamp);
    return `${formatDisplayDate(date)} at ${formatDisplayTime(date)}`;
  };

  // Group data by day for daily view
  const groupByDay = (data) => {
    const dailyMap = {};
    
    data.forEach(item => {
      const dateKey = item.timestamp.toLocaleDateString();
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          displayDate: formatDisplayDate(item.timestamp),
          temperature: [],
          humidity: [],
          gasLevel: [],
          altitude: []
        };
      }
      dailyMap[dateKey].temperature.push(item.temperature);
      dailyMap[dateKey].humidity.push(item.humidity);
      dailyMap[dateKey].gasLevel.push(item.gasLevel);
    });

    return Object.values(dailyMap).map(day => ({
      date: day.date,
      displayDate: day.displayDate,
      temperature_avg: day.temperature.reduce((a, b) => a + b, 0) / day.temperature.length,
      temperature_max: Math.max(...day.temperature),
      temperature_min: Math.min(...day.temperature),
      humidity_avg: day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length,
      humidity_max: Math.max(...day.humidity),
      humidity_min: Math.min(...day.humidity),
      gasLevel_avg: day.gasLevel.reduce((a, b) => a + b, 0) / day.gasLevel.length,
      gasLevel_max: Math.max(...day.gasLevel),
    }));
  };

  const dailyData = groupByDay(filteredData);

  // Gas level specific formatting
  const formatGasLevelTick = (value) => {
    return value.toLocaleString();
  };

  const formatGasLevelTooltip = (value) => {
    return [`${value.toLocaleString()} ppm`, "Gas Level"];
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>📊 Weather Data Analytics Dashboard</h1>
      
      {/* Alerts Section */}
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
      
      {/* Controls Section */}
      <div className={styles.controls}>
        <div className={styles.controlsInner}>
          <div className={styles.viewToggle}>
            <button
              onClick={() => setViewMode("overall")}
              className={viewMode === "overall" ? styles.viewButtonActive : styles.viewButtonInactive}
            >
              Overall Analysis
            </button>
            <button
              onClick={() => setViewMode("daily")}
              className={viewMode === "daily" ? styles.viewButtonActive : styles.viewButtonInactive}
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
          {/* Statistics Summary */}
          {stats && (
            <div className={styles.statsGrid}>
              <StatCard
                title="Temperature"
                value={`${stats.temperature.avg.toFixed(1)}°C`}
                description={`Range: ${stats.temperature.min}°C - ${stats.temperature.max}°C`}
                trend={stats.temperature.avg > 25 ? "high" : stats.temperature.avg < 15 ? "low" : "normal"}
                icon="🌡️"
              />
              <StatCard
                title="Humidity"
                value={`${stats.humidity.avg.toFixed(1)}%`}
                description={`Range: ${stats.humidity.min}% - ${stats.humidity.max}%`}
                trend={stats.humidity.avg > 60 ? "high" : stats.humidity.avg < 40 ? "low" : "normal"}
                icon="💧"
              />
              <StatCard
                title="Gas Levels"
                value={`${stats.gasLevel.avg.toFixed(1)} ppm`}
                description={`Median: ${stats.gasLevel.median.toFixed(1)} ppm`}
                trend={stats.gasLevel.avg > 300 ? "high" : "normal"}
                icon="🔥"
              />
              <StatCard
                title="Readings Analyzed"
                value={stats.readings}
                description={`Period: ${stats.period}`}
                icon="📊"
              />
            </div>
          )}
          
          {/* Charts Section */}
          <div className={styles.chartSection}>
            <h2 className={styles.sectionTitle}>
              {viewMode === "overall" ? "Sensor Data Trends" : "Daily Averages"}
            </h2>
            
            {viewMode === "overall" ? (
              <div className={styles.chartsGrid}>
                <ChartContainer title="Temperature Trend (°C)">
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
                        formatter={(value) => [`${value}°C`, "Temperature"]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer title="Humidity Trend (%)">
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
                        formatter={(value) => [`${value}%`, "Humidity"]}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="humidity" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer title="Gas Levels Trend (ppm)">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatChartTick}
                      />
                      <YAxis 
                        tickFormatter={formatGasLevelTick}
                        label={{ value: 'ppm', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        labelFormatter={formatTooltipLabel}
                        formatter={formatGasLevelTooltip}
                      />
                      <Legend />
                      <ReferenceLine 
                        y={500} 
                        label="Warning" 
                        stroke="#f59e0b" 
                        strokeDasharray="3 3" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="gasLevel" 
                        name="Gas Level (ppm)"
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className={styles.chartsGrid}>
                <ChartContainer title="Daily Temperature Averages">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" />
                      <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name.includes("Temp")) return [`${value}°C`, name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="temperature_avg" name="Avg Temp" fill="#3b82f6" />
                      <Bar dataKey="temperature_max" name="Max Temp" fill="#93c5fd" />
                      <Bar dataKey="temperature_min" name="Min Temp" fill="#bfdbfe" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer title="Daily Humidity Averages">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" />
                      <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name.includes("Humidity")) return [`${value}%`, name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="humidity_avg" name="Avg Humidity" fill="#10b981" />
                      <Bar dataKey="humidity_max" name="Max Humidity" fill="#6ee7b7" />
                      <Bar dataKey="humidity_min" name="Min Humidity" fill="#a7f3d0" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                
                <ChartContainer title="Daily Gas Level Averages (ppm)">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" />
                      <YAxis 
                        tickFormatter={formatGasLevelTick}
                        label={{ value: 'ppm', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={formatGasLevelTooltip}
                      />
                      <Legend />
                      <Bar dataKey="gasLevel_avg" name="Avg Gas Level" fill="#8b5cf6" />
                      <Bar dataKey="gasLevel_max" name="Max Gas Level" fill="#d946ef" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </div>
          
          {/* Data Analysis Insights */}
          {stats && (
            <div className={styles.insightsSection}>
              <h2 className={styles.sectionTitle}>
                📈 Data Analysis Insights
              </h2>
              
              <div className={styles.insightsContent}>
                <p>
                  <strong>Temperature Analysis:</strong> The average temperature was {stats.temperature.avg.toFixed(1)}°C. 
                  {stats.temperature.avg > 25 
                    ? " This is considered high and may indicate heat conditions." 
                    : stats.temperature.avg < 15 
                      ? " This is considered low and may indicate cold conditions." 
                      : " This is within normal range."}
                </p>
                
                <p>
                  <strong>Humidity Analysis:</strong> Average humidity levels were {stats.humidity.avg.toFixed(1)}%. 
                  {stats.humidity.avg > 60 
                    ? " High humidity can lead to discomfort and potential mold growth." 
                    : stats.humidity.avg < 40 
                      ? " Low humidity may cause dry air conditions." 
                      : " Humidity levels are optimal."}
                </p>
                
                <p>
                  <strong>Gas Level Analysis:</strong> The average gas reading was {stats.gasLevel.avg.toFixed(1)} ppm. 
                  {stats.gasLevel.avg > 300 
                    ? " ⚠️ Warning: Elevated gas levels detected which may indicate poor air quality." 
                    : " Gas levels are within normal range."}
                </p>
                
                <p>
                  <strong>Data Summary:</strong> Analyzed {stats.readings} readings{
                    startDate && endDate 
                      ? ` between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`
                      : " across all available data"
                  }.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, description, trend, icon }) => {
  const trendColors = {
    high: `${styles.statCard} ${styles.statCardHigh}`,
    low: `${styles.statCard} ${styles.statCardLow}`,
    normal: `${styles.statCard} ${styles.statCardNormal}`
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

// Reusable Chart Container Component
const ChartContainer = ({ title, children }) => {
  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {children}
    </div>
  );
};

export default AnalyzeData;