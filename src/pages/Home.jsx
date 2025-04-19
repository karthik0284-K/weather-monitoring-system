import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "../styles/home.module.css";

const Home = () => {
  const navigate = useNavigate();
  const [timeOfDay, setTimeOfDay] = useState("day");

  useEffect(() => {
    // Set time of day based on current time
    const hours = new Date().getHours();
    setTimeOfDay(hours > 18 || hours < 6 ? "night" : "day");
  }, []);

  return (
    <div className={`${styles.container} ${styles[timeOfDay]}`}>
      {/* Animated Background Layers */}
      <div className={styles.background}>
        <div className={styles.sky}></div>
        <div className={styles.mountains}></div>
        <div className={styles.hills}></div>
        <div className={styles.trees}></div>
        <div className={styles.ground}></div>
        <div className={styles.clouds}></div>
        <div className={styles.stars}></div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <main className={styles.main}>
          <div className={styles.hero}>
            <h1 className={styles.title}>
              Smart <span>Weather</span> Monitoring
            </h1>
            <p className={styles.subtitle}>
              Real-time environmental analytics with predictive insights and
              AI-powered forecasting
            </p>

            <div className={styles.buttons}>
              <button
                onClick={() => navigate("/real-time")}
                className={styles.primaryBtn}
              >
                Live Dashboard
              </button>
              <button
                onClick={() => navigate("/analyze")}
                className={styles.secondaryBtn}
              >
                Data Analytics
              </button>
            </div>
          </div>

          <section className={styles.features}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌦️</div>
              <h3>Live Tracking</h3>
              <p>Real-time sensor data with millisecond precision</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📉</div>
              <h3>Trend Analysis</h3>
              <p>Historical data visualization</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔮</div>
              <h3>AI Forecasting</h3>
              <p>Predictive weather models</p>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Smart Weather Systems</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
