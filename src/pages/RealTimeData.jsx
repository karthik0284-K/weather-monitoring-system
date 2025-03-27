import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database"; // ✅ Correct import for Realtime DB
import { db } from "../firebase";

const RealTimeData = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const dataRef = ref(db, "sensor_readings"); // ✅ Reference to Firebase Realtime Database

    onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = Object.keys(snapshot.val()).map((key) => ({
          id: key,
          ...snapshot.val()[key],
        }));
        setData(fetchedData);
      } else {
        setData([]); // If no data is available
      }
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-center my-4">
        Real-Time Weather Data
      </h1>

      {data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((entry) => (
            <div
              key={entry.id}
              className="p-4 border rounded-lg shadow bg-gray-100"
            >
              <h2 className="font-bold text-lg text-blue-600">
                📍 {entry.location || "Unknown Location"}
              </h2>
              <p>
                🌡 <strong>Temperature:</strong> {entry.temperature}°C
              </p>
              <p>
                💧 <strong>Humidity:</strong> {entry.humidity}%
              </p>
              <p>
                🛢 <strong>Gas Level:</strong> {entry.gasLevel}
              </p>
              <p>
                🕒 <strong>Time:</strong>{" "}
                {entry.timestamp}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-600">
          No real-time data available.
        </p>
      )}
    </div>
  );
};

export default RealTimeData;
