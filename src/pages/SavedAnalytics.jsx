import { useState, useEffect } from "react";
import { ref, push, onValue } from "firebase/database";
import { db } from "../firebase";
import Navbar from "../components/Navbar";

const SavedAnalytics = () => {
  const [location, setLocation] = useState("");
  const [savedData, setSavedData] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  // Function to save data in Firebase Realtime Database
  const startRecording = async () => {
    if (!location.trim()) return alert("Enter a valid location name!");
    setIsRecording(true);

    const newEntryRef = ref(db, "saved_analytics"); // Reference to Firebase Realtime Database

    try {
      await push(newEntryRef, {
        location,
        timestamp: Date.now(), // Use Unix timestamp
        data: { temperature: 25, humidity: 60, gasLevel: 10 }, // Replace with actual sensor data
      });

      alert("Data saved successfully!");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to save data.");
    }

    setIsRecording(false);
  };

  // Function to fetch all saved data from Firebase Realtime Database
  useEffect(() => {
    const savedDataRef = ref(db, "saved_analytics");

    onValue(savedDataRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedData = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setSavedData(formattedData);
      } else {
        setSavedData([]);
      }
    });
  }, []);

  return (
    <div>
      <Navbar />
      <h1 className="text-3xl font-bold text-center my-6">Saved Analytics</h1>

      <div className="flex flex-col items-center space-y-4">
        <input
          type="text"
          placeholder="Enter location name"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="p-2 border rounded w-80 text-center"
        />

        <button
          onClick={startRecording}
          disabled={isRecording}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {isRecording ? "Recording..." : "Start Recording"}
        </button>
      </div>

      <div className="mt-6 max-w-2xl mx-auto">
        {savedData.length > 0 ? (
          savedData.map((entry) => (
            <div
              key={entry.id}
              className="p-4 border m-2 bg-gray-100 rounded-lg shadow"
            >
              <h2 className="font-bold text-lg">{entry.location}</h2>
              <p>🌡 Temperature: {entry.data.temperature}°C</p>
              <p>💧 Humidity: {entry.data.humidity}%</p>
              <p>🛢 Gas Level: {entry.data.gasLevel}</p>
              <p>🕒 Time: {new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-600">No saved data found.</p>
        )}
      </div>
    </div>
  );
};

export default SavedAnalytics;
