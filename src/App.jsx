import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import RealTimeData from "./pages/RealTimeData";
import AnalyzeData from "./pages/AnalyzeData";
import Locate from "./pages/Locate";
import ViewTrends from "./pages/ViewTrends";
import Compare from "./pages/Compare";
import './styles/global.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/real-time" element={<RealTimeData />} />
            <Route path="/analyze" element={<AnalyzeData />} />
            <Route path="/locate" element={<Locate />} />
            <Route path="/view" element={<ViewTrends />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
