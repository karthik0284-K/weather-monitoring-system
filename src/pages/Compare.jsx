import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiCalendar, FiTrendingUp, FiTrendingDown, FiActivity, FiThermometer, FiDroplet, FiWind } from "react-icons/fi";
import "../styles/Compare.css";

const Compare = () => {
  const [allData, setAllData] = useState([]);
  const [date1, setDate1] = useState(null);
  const [date2, setDate2] = useState(null);
  const [day1Data, setDay1Data] = useState([]);
  const [day2Data, setDay2Data] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const dataRef = ref(db, "sensor_readings");
    setLoading(true);

    const handleData = (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Raw Firebase data:", data);
        
        const processedData = Object.entries(data).map(([key, value]) => {
          // Convert timestamp to Date object
          let timestamp;
          if (value.timestamp) {
            timestamp = typeof value.timestamp === 'number' 
              ? value.timestamp 
              : new Date(value.timestamp).getTime();
          } else {
            timestamp = Date.now();
          }
          
          return {
            id: key,
            ...value,
            timestamp,
            dateString: new Date(timestamp).toDateString()
          };
        });
        
        console.log("Processed data:", processedData);
        setAllData(processedData);
      } else {
        console.log("No data available in Firebase");
        setAllData([]);
      }
      setLoading(false);
    };

    const errorHandler = (error) => {
      console.error("Firebase error:", error);
      setLoading(false);
    };

    onValue(dataRef, handleData, errorHandler);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const filterDataByDate = (date) => {
    if (!date) return [];
    
    const targetDate = new Date(date);
    const targetDateString = targetDate.toDateString();
    
    console.log(`Filtering for: ${targetDateString}`);
    
    const filtered = allData.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate.toDateString() === targetDateString;
    });
    
    console.log(`Found ${filtered.length} matches`);
    return filtered;
  };

  const handleCompare = () => {
    if (!date1 || !date2) {
      alert("Please select both dates");
      return;
    }
    
    const day1Results = filterDataByDate(date1);
    const day2Results = filterDataByDate(date2);
    
    setDay1Data(day1Results);
    setDay2Data(day2Results);
    
    if (day1Results.length === 0 || day2Results.length === 0) {
      setAnalysis(null);
      alert(`No data found for ${day1Results.length === 0 ? "first" : "second"} selected date`);
      return;
    }
    
    // Calculate averages
    const calculateAvg = (data, field) => {
      const values = data.map(item => item.data?.[field]).filter(val => val !== undefined);
      if (values.length === 0) return 0;
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    };
    
    const avgTemp1 = calculateAvg(day1Results, 'temperature');
    const avgTemp2 = calculateAvg(day2Results, 'temperature');
    const avgHumidity1 = calculateAvg(day1Results, 'humidity');
    const avgHumidity2 = calculateAvg(day2Results, 'humidity');
    const avgGas1 = calculateAvg(day1Results, 'gasLevel');
    const avgGas2 = calculateAvg(day2Results, 'gasLevel');
    
    // Calculate differences
    const calculateDiff = (a, b) => ((b - a) / (a || 1)) * 100;
    
    setAnalysis({
      tempDiff: avgTemp2 - avgTemp1,
      humidityDiff: avgHumidity2 - avgHumidity1,
      gasDiff: avgGas2 - avgGas1,
      tempPercentage: calculateDiff(avgTemp1, avgTemp2).toFixed(2),
      humidityPercentage: calculateDiff(avgHumidity1, avgHumidity2).toFixed(2),
      gasPercentage: calculateDiff(avgGas1, avgGas2).toFixed(2),
      avgTemp1,
      avgTemp2,
      avgHumidity1,
      avgHumidity2,
      avgGas1,
      avgGas2
    });
  };

  const renderTrendIndicator = (value) => {
    if (value > 0) {
      return <FiTrendingUp className="trend-icon trend-up" />;
    } else if (value < 0) {
      return <FiTrendingDown className="trend-icon trend-down" />;
    }
    return null;
  };

  return (
    <div className="compare-container">
      <div className="compare-header">
        <h1 className="compare-title">Weather Data Comparison</h1>
        <p className="compare-subtitle">Select two dates to analyze environmental changes</p>
      </div>

      <div className="date-selector-container">
        <div className="date-picker-group">
          <div className="date-picker-wrapper">
            <FiCalendar className="date-picker-icon" />
            <DatePicker
              selected={date1}
              onChange={setDate1}
              className="date-picker-input"
              placeholderText="Select first date"
              maxDate={new Date()}
              dateFormat="MMMM d, yyyy"
              isClearable
            />
          </div>
          <div className="date-picker-wrapper">
            <FiCalendar className="date-picker-icon" />
            <DatePicker
              selected={date2}
              onChange={setDate2}
              className="date-picker-input"
              placeholderText="Select second date"
              maxDate={new Date()}
              dateFormat="MMMM d, yyyy"
              isClearable
            />
          </div>
        </div>
        
        <button
          onClick={handleCompare}
          disabled={!date1 || !date2 || loading}
          className={`compare-button ${(!date1 || !date2 || loading) ? 'disabled' : ''}`}
        >
          {loading ? (
            <span className="button-loading">
              <span className="loading-spinner"></span>
              Processing...
            </span>
          ) : (
            'Compare Dates'
          )}
        </button>
      </div>

      {analysis && (
        <div className="analysis-section">
          <div className="section-header">
            <FiActivity className="section-icon" />
            <h2 className="section-title">Comparative Analysis</h2>
          </div>
          
          <div className="metrics-grid">
            <div className="metric-card temperature">
              <div className="metric-header">
                <FiThermometer className="metric-icon" />
                <h3 className="metric-title">Temperature</h3>
              </div>
              <div className="metric-values">
                <div className="metric-value-group">
                  <span className="metric-value">{analysis.avgTemp1.toFixed(1)}°C</span>
                  <span className="metric-label">Day 1 Avg</span>
                </div>
                <div className="metric-value-group">
                  <span className="metric-value">{analysis.avgTemp2.toFixed(1)}°C</span>
                  <span className="metric-label">Day 2 Avg</span>
                </div>
              </div>
              <div className="metric-difference">
                <span className={`difference-value ${analysis.tempDiff > 0 ? 'increase' : 'decrease'}`}>
                  {Math.abs(analysis.tempDiff).toFixed(1)}°C {renderTrendIndicator(analysis.tempDiff)}
                </span>
                <span className="difference-percentage">
                  {analysis.tempDiff > 0 ? 'Increase' : 'Decrease'} of {Math.abs(analysis.tempPercentage)}%
                </span>
              </div>
            </div>

            <div className="metric-card humidity">
              <div className="metric-header">
                <FiDroplet className="metric-icon" />
                <h3 className="metric-title">Humidity</h3>
              </div>
              <div className="metric-values">
                <div className="metric-value-group">
                  <span className="metric-value">{analysis.avgHumidity1.toFixed(1)}%</span>
                  <span className="metric-label">Day 1 Avg</span>
                </div>
                <div className="metric-value-group">
                  <span className="metric-value">{analysis.avgHumidity2.toFixed(1)}%</span>
                  <span className="metric-label">Day 2 Avg</span>
                </div>
              </div>
              <div className="metric-difference">
                <span className={`difference-value ${analysis.humidityDiff > 0 ? 'increase' : 'decrease'}`}>
                  {Math.abs(analysis.humidityDiff).toFixed(1)}% {renderTrendIndicator(analysis.humidityDiff)}
                </span>
                <span className="difference-percentage">
                  {analysis.humidityDiff > 0 ? 'Increase' : 'Decrease'} of {Math.abs(analysis.humidityPercentage)}%
                </span>
              </div>
            </div>

            <div className="metric-card gas">
              <div className="metric-header">
                <FiWind className="metric-icon" />
                <h3 className="metric-title">Gas Level</h3>
              </div>
              <div className="metric-values">
                <div className="metric-value-group">
                  <span className="metric-value">{analysis.avgGas1.toFixed(1)}</span>
                  <span className="metric-label">Day 1 Avg</span>
                </div>
                <div className="metric-value-group">
                  <span className="metric-value">{analysis.avgGas2.toFixed(1)}</span>
                  <span className="metric-label">Day 2 Avg</span>
                </div>
              </div>
              <div className="metric-difference">
                <span className={`difference-value ${analysis.gasDiff > 0 ? 'increase' : 'decrease'}`}>
                  {Math.abs(analysis.gasDiff).toFixed(1)} {renderTrendIndicator(analysis.gasDiff)}
                </span>
                <span className="difference-percentage">
                  {analysis.gasDiff > 0 ? 'Increase' : 'Decrease'} of {Math.abs(analysis.gasPercentage)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="data-comparison-section">
        <div className="section-header">
          <h2 className="section-title">Detailed Data Comparison</h2>
        </div>
        
        <div className="data-grid">
          <div className="data-column">
            <h3 className="data-column-title">
              {date1 ? date1.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select First Date'}
            </h3>
            {day1Data.length > 0 ? (
              day1Data.map((entry) => (
                <div key={entry.id} className="data-card">
                  <h4 className="data-location">{entry.location || 'Unknown Location'}</h4>
                  <div className="data-metrics">
                    <div className="data-metric">
                      <FiThermometer className="data-icon temp" />
                      <span>{entry.data?.temperature?.toFixed(1) || 'N/A'}°C</span>
                    </div>
                    <div className="data-metric">
                      <FiDroplet className="data-icon humidity" />
                      <span>{entry.data?.humidity?.toFixed(1) || 'N/A'}%</span>
                    </div>
                    <div className="data-metric">
                      <FiWind className="data-icon gas" />
                      <span>{entry.data?.gasLevel?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                  <p className="data-timestamp">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            ) : (
              <div className="empty-state">
                {date1 ? 'No data available for selected date' : 'Select a date to view data'}
              </div>
            )}
          </div>

          <div className="data-column">
            <h3 className="data-column-title">
              {date2 ? date2.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select Second Date'}
            </h3>
            {day2Data.length > 0 ? (
              day2Data.map((entry) => (
                <div key={entry.id} className="data-card">
                  <h4 className="data-location">{entry.location || 'Unknown Location'}</h4>
                  <div className="data-metrics">
                    <div className="data-metric">
                      <FiThermometer className="data-icon temp" />
                      <span>{entry.data?.temperature?.toFixed(1) || 'N/A'}°C</span>
                    </div>
                    <div className="data-metric">
                      <FiDroplet className="data-icon humidity" />
                      <span>{entry.data?.humidity?.toFixed(1) || 'N/A'}%</span>
                    </div>
                    <div className="data-metric">
                      <FiWind className="data-icon gas" />
                      <span>{entry.data?.gasLevel?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                  <p className="data-timestamp">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            ) : (
              <div className="empty-state">
                {date2 ? 'No data available for selected date' : 'Select a date to view data'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug information - remove in production */}
      <div className="debug-info">
        <h3>Debug Data</h3>
        <p>Total records loaded: {allData.length}</p>
        {allData.length > 0 && (
          <>
            <p>Sample record timestamp: {new Date(allData[0].timestamp).toString()}</p>
            <p>Sample record data: {JSON.stringify(allData[0].data)}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Compare;