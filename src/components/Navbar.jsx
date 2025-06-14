import { Link } from "react-router-dom";
import "../styles/Navbar.css";

const Navbar = () => {
  return (
    <nav className="bg-blue-600 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-white text-xl font-bold">Smart Weather Monitor</h1>
        <div className="space-x-4">
          <Link to="/" className="text-white">
            Home
          </Link>
          <Link to="/real-time" className="text-white">
            Real Time Data
          </Link>
          <Link to="/analyze" className="text-white">
            Analyze Data
          </Link>
          <Link to="/locate" className="text-white">
            Regression Analysis
          </Link>
          <Link to="/view" className="text-white">
            View Trends
          </Link>
          <Link to="/compare" className="text-white">
            Compare
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
