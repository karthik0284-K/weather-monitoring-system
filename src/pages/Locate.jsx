import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";
import Navbar from "../components/Navbar";

const Locate = () => {
  const { isLoaded } = useLoadScript({ googleMapsApiKey:"AIzaSyD6oR6e-7GCylEFsGhv5LZqQMB27N28j38" });

  return (
    <div>
      <Navbar />
      <h1 className="text-3xl font-bold text-center my-6">Locate Your Position</h1>
      {isLoaded ? (
        <GoogleMap center={{ lat: 37.7749, lng: -122.4194 }} zoom={10} mapContainerStyle={{ width: "100%", height: "500px" }}>
          <Marker position={{ lat: 37.7749, lng: -122.4194 }} />
        </GoogleMap>
      ) : (
        <p>Loading map...</p>
      )}
    </div>
  );
};

export default Locate;
