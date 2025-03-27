import styles from "../styles/home.module.css";

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <header className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>Smart Weather Monitor</h1>
          <p className={styles.subtitle}>
            Get real-time weather updates, analyze historical data, and compare
            trends effortlessly.
          </p>
          <div className={styles.buttons}>
            <a href="/real-time" className={styles.primaryBtn}>
              View Real-Time Data
            </a>
            <a href="/analyze" className={styles.secondaryBtn}>
              Analyze Trends
            </a>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Home;
