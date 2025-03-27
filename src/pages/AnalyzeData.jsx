import { useEffect, useState } from "react";
import { db } from "../firebase"; // Import the correct database instance
import { ref, onValue } from "firebase/database";

const AnalyzeData = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const dataRef = ref(db, "weatherData"); // Correct path to the data
    const unsubscribe = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.val());
      } else {
        setData(null);
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  return (
    <div className="p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        📊 Analyze Weather Data
      </h1>

      {data ? (
        <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-lg border border-gray-300">
          <div className="text-lg font-semibold space-y-2">
            <p>
              🌡 <span className="text-blue-600">Temperature:</span>{" "}
              {data.temperature} °C
            </p>
            <p>
              💧 <span className="text-green-600">Humidity:</span>{" "}
              {data.humidity} %
            </p>
            <p>
              ⛰ <span className="text-gray-600">Altitude:</span> {data.altitude}{" "}
              m
            </p>
            <p>
              🔥 <span className="text-red-600">Gas Level:</span>{" "}
              {data.gasLevel}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-xl">Loading data for analysis...</p>
      )}
    </div>
  );
};

export default AnalyzeData;
