import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database"; // ✅ Correct for Realtime Database
import { db } from "../firebase";

const Compare = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const dataRef = ref(db, "saved_analytics"); // ✅ Reference to Realtime Database

    onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = Object.keys(snapshot.val()).map((key) => ({
          id: key,
          ...snapshot.val()[key],
        }));
        setData(fetchedData);
      } else {
        setData([]); // No data available
      }
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center">Comparison Data</h1>

      {data.length > 0 ? (
        data.map((entry) => (
          <div
            key={entry.id}
            className="p-4 border m-2 bg-gray-100 rounded-lg shadow"
          >
            <h2 className="font-bold">{entry.location}</h2>
            <p>🌡 Temperature: {entry.data.temperature}°C</p>
            <p>💧 Humidity: {entry.data.humidity}%</p>
            <p>🛢 Gas Level: {entry.data.gasLevel}</p>
            <p>🕒 Time: {new Date(entry.timestamp).toLocaleString()}</p>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-600">
          No comparison data available.
        </p>
      )}
    </div>
  );
};

export default Compare;
