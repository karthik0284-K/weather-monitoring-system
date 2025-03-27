import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  query,
  limitToLast,
  orderByKey,
} from "firebase/database";
import { db } from "../firebase";
import styles from "../styles/realTime.module.css";

const RealTimeData = () => {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [latestLoading, setLatestLoading] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);

  // Subscribe to only the last entry for real-time updates
  useEffect(() => {
    const lastEntryRef = query(
      ref(db, "sensor_readings"),
      orderByKey(),
      limitToLast(1)
    );

    const unsubscribeLastEntry = onValue(lastEntryRef, (snapshot) => {
      if (snapshot.exists()) {
        const entries = [];
        snapshot.forEach((childSnapshot) => {
          entries.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });

        if (entries.length > 0) {
          setLatestLoading(true);
          setTimeout(() => {
            setLastEntry(entries[0]);
            setLatestLoading(false);
          }, 300); // Brief loading animation
        }
      }
    });

    return () => unsubscribeLastEntry();
  }, []);

  // Load historical data separately
  useEffect(() => {
    const dataRef = ref(db, "sensor_readings");
    const unsubscribeAll = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = Object.keys(snapshot.val()).map((key) => ({
          id: key,
          ...snapshot.val()[key],
        }));

        // Sort by timestamp (newest first)
        fetchedData.sort(
          (a, b) =>
            new Date(b.timestamp.replace(/_/g, "-").replace(/-/g, "/")) -
            new Date(a.timestamp.replace(/_/g, "-").replace(/-/g, "/"))
        );

        setData(fetchedData);
      } else {
        setData([]);
      }
      setLoading(false);
    });

    return () => unsubscribeAll();
  }, []);

  // Format timestamp to readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";

    // Convert "2025-03-01_10-24-01" to "March 1, 2025, 10:24:01 AM"
    const [datePart, timePart] = timestamp.split("_");
    const [year, month, day] = datePart.split("-");
    const [hour, minute, second] = timePart.split("-");

    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Filtered Data (based on selected date)
  const filteredData = selectedDate
    ? data.filter((entry) => entry.timestamp?.startsWith(selectedDate))
    : data;

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>
        <span className={styles.headerIcon}>🌎</span> Real-Time Weather
        Dashboard
      </h1>

      {/* Last Entry (Highlighted) - Updates in real-time */}
      <div className={styles.latestCard}>
        <h2 className={styles.latestHeader}>
          <span className={styles.latestIcon}>🆕</span> Last Reading
          {latestLoading && <span className={styles.loadingDot}></span>}
        </h2>

        {latestLoading ? (
          <div className={styles.latestGrid}>
            {[...Array(7)].map((_, i) => (
              <div key={i} className={styles.skeletonItem}>
                <div className={styles.skeletonIcon}></div>
                <div className={styles.skeletonText}></div>
              </div>
            ))}
            <div className={styles.skeletonTimestamp}></div>
          </div>
        ) : lastEntry ? (
          <div className={styles.latestGrid}>
            {[
              {
                icon: "📍",
                label: "Location",
                value: lastEntry.location || "Ettimadai",
              },
              {
                icon: "🌡",
                label: "Temperature",
                value: `${lastEntry.temperature}°C`,
              },
              {
                icon: "💧",
                label: "Humidity",
                value: `${lastEntry.humidity}%`,
              },
              {
                icon: "⛰",
                label: "Altitude",
                value: `${lastEntry.altitude} m`,
              },
              {
                icon: "🔵",
                label: "Pressure",
                value: `${lastEntry.pressure} hPa`,
              },
              { icon: "☀️", label: "UV Index", value: lastEntry.uv_index },
              { icon: "🛢", label: "Gas Level", value: lastEntry.gas_level },
            ].map((item, index) => (
              <div key={index} className={styles.latestItem}>
                <span className={styles.latestItemIcon}>{item.icon}</span>
                <span className={styles.latestItemLabel}>{item.label}:</span>
                <span className={styles.latestItemValue}>{item.value}</span>
              </div>
            ))}
            <div className={styles.timestamp}>
              <span className={styles.clockIcon}>🕒</span>
              {formatTimestamp(lastEntry.timestamp)}
            </div>
          </div>
        ) : (
          <div className={styles.noData}>Waiting for first reading...</div>
        )}
      </div>

      {/* Date Picker */}
      <div className={styles.datePickerContainer}>
        <label htmlFor="date-selector" className={styles.datePickerLabel}>
          Filter by Date:
        </label>
        <input
          id="date-selector"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={styles.datePicker}
        />
      </div>

      {/* Historical Data List */}
      {loading ? (
        <div className={styles.dataGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonCardHeader}></div>
              <div className={styles.skeletonCardContent}>
                {[...Array(6)].map((_, j) => (
                  <div key={j} className={styles.skeletonDataItem}></div>
                ))}
              </div>
              <div className={styles.skeletonCardFooter}></div>
            </div>
          ))}
        </div>
      ) : filteredData.length > 0 ? (
        <div className={styles.dataGrid}>
          {filteredData.map((entry) => (
            <div key={entry.id} className={styles.dataCard}>
              <h2 className={styles.dataCardHeader}>
                <span className={styles.locationIcon}>📍</span>{" "}
                {entry.location || "Ettimadai"}
              </h2>
              <div className={styles.dataCardContent}>
                {[
                  { icon: "🌡", label: "Temp", value: `${entry.temperature}°C` },
                  {
                    icon: "💧",
                    label: "Humidity",
                    value: `${entry.humidity}%`,
                  },
                  {
                    icon: "⛰",
                    label: "Altitude",
                    value: `${entry.altitude} m`,
                  },
                  {
                    icon: "🔵",
                    label: "Pressure",
                    value: `${entry.pressure} hPa`,
                  },
                  { icon: "☀️", label: "UV", value: entry.uv_index },
                  { icon: "🛢", label: "Gas", value: entry.gas_level },
                ].map((item, index) => (
                  <div key={index} className={styles.dataItem}>
                    <span className={styles.dataItemIcon}>{item.icon}</span>
                    <span className={styles.dataItemLabel}>{item.label}:</span>
                    <span className={styles.dataItemValue}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.dataCardFooter}>
                <span className={styles.clockIcon}>🕒</span>
                {formatTimestamp(entry.timestamp)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noDataMessage}>
          No data available for the selected date.
        </p>
      )}
    </div>
  );
};

export default RealTimeData;
