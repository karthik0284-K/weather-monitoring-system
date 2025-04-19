import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from "chart.js";
import * as regression from "regression";
import { format, parseISO } from "date-fns";
import {
  Card,
  Select,
  Button,
  Table,
  Spin,
  Alert,
  Typography,
  Row,
  Col,
  Descriptions,
} from "antd";
import { CalculatorOutlined, LineChartOutlined } from "@ant-design/icons";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import styles from "../styles/Locate.module.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

const { Title: AntTitle, Text } = Typography;
const { Option } = Select;

const Locate = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [regressionResult, setRegressionResult] = useState(null);
  const [selectedVariable, setSelectedVariable] = useState("temperature");
  const [error, setError] = useState(null);
  const [boxplotData, setBoxplotData] = useState(null);

  // Fetch data from Firebase
  useEffect(() => {
    const dataRef = ref(db, "sensor_readings");
    setLoading(true);

    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const processedData = Object.keys(rawData)
            .map((key) => {
              const item = rawData[key];
              if (!item || !item.timestamp) return null;

              const timestamp = item.timestamp.split("_")[0];
              const parsedDate = timestamp
                ? parseISO(timestamp.replace(/_/g, "T"))
                : new Date();

              return {
                id: key,
                date: parsedDate,
                temperature: parseFloat(item.temperature) || 0,
                humidity: parseFloat(item.humidity) || 0,
                pressure: parseFloat(item.pressure) || 0,
                gas_level: parseFloat(item.gas_level) || 0,
              };
            })
            .filter((item) => item !== null)
            .sort((a, b) => a.date - b.date);

          setData(processedData);
          prepareBoxplotData(processedData);
        } else {
          setData([]);
          setBoxplotData(null);
        }
        setLoading(false);
      },
      (error) => {
        setError(`Failed to fetch data: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const prepareBoxplotData = (data) => {
    if (!data || !data.length) {
      setBoxplotData(null);
      return;
    }

    const variables = ["temperature", "humidity", "pressure", "gas_level"];
    const stats = variables.map((variable) => {
      const values = data
        .map((item) => item[variable])
        .filter((val) => !isNaN(val));
      return {
        label: variable,
        data: calculateBoxplotStats(values),
      };
    });

    setBoxplotData(stats);
  };

  const calculateBoxplotStats = (values) => {
    if (!values || !values.length) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const min = Math.max(sorted[0], q1 - 1.5 * iqr);
    const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);

    return { min, q1, median, q3, max };
  };

  const metrics = [
    {
      key: "linear",
      name: "Linear Regression",
      calculate: (x, y) => regression.linear(x.map((val, i) => [val, y[i]])),
      equation: (coeffs) =>
        `y = ${coeffs[0].toFixed(4)} + ${coeffs[1].toFixed(4)}x`,
      interpretation: (r2) => {
        if (r2 > 0.7) return "Strong linear relationship";
        if (r2 > 0.3) return "Moderate linear relationship";
        return "Weak or no linear relationship";
      },
    },
    {
      key: "exponential",
      name: "Exponential Regression",
      calculate: (x, y) =>
        regression.exponential(x.map((val, i) => [val, y[i]])),
      equation: (coeffs) =>
        `y = ${coeffs[0].toFixed(4)}e^(${coeffs[1].toFixed(4)}x)`,
      interpretation: (r2) => {
        if (r2 > 0.7) return "Strong exponential growth/decay pattern";
        if (r2 > 0.3) return "Moderate exponential pattern";
        return "Weak or no exponential pattern";
      },
    },
    {
      key: "polynomial",
      name: "Polynomial Regression (2nd degree)",
      calculate: (x, y) =>
        regression.polynomial(
          x.map((val, i) => [val, y[i]]),
          { order: 2 }
        ),
      equation: (coeffs) =>
        `y = ${coeffs[0].toFixed(4)} + ${coeffs[1].toFixed(
          4
        )}x + ${coeffs[2].toFixed(4)}x²`,
      interpretation: (r2) => {
        if (r2 > 0.7) return "Strong polynomial relationship";
        if (r2 > 0.3) return "Moderate polynomial relationship";
        return "Weak or no polynomial relationship";
      },
    },
    {
      key: "logarithmic",
      name: "Logarithmic Regression",
      calculate: (x, y) =>
        regression.logarithmic(x.map((val, i) => [val, y[i]])),
      equation: (coeffs) =>
        `y = ${coeffs[0].toFixed(4)} + ${coeffs[1].toFixed(4)}ln(x)`,
      interpretation: (r2) => {
        if (r2 > 0.7) return "Strong logarithmic relationship";
        if (r2 > 0.3) return "Moderate logarithmic relationship";
        return "Weak or no logarithmic relationship";
      },
    },
    {
      key: "power",
      name: "Power Regression",
      calculate: (x, y) => regression.power(x.map((val, i) => [val, y[i]])),
      equation: (coeffs) =>
        `y = ${coeffs[0].toFixed(4)}x^${coeffs[1].toFixed(4)}`,
      interpretation: (r2) => {
        if (r2 > 0.7) return "Strong power law relationship";
        if (r2 > 0.3) return "Moderate power law relationship";
        return "Weak or no power law relationship";
      },
    },
  ];

  const variables = [
    { key: "temperature", name: "Temperature (°C)" },
    { key: "humidity", name: "Humidity (%)" },
    { key: "pressure", name: "Pressure (hPa)" },
    { key: "gas_level", name: "Gas Level (ppm)" },
  ];

  const calculateRegression = () => {
    if (!selectedMetric || !data.length) {
      setError("Please select a regression type and ensure data is loaded.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const x = data.map((_, i) => i);
      const y = data.map((item) => item[selectedVariable]);
      const metric = metrics.find((m) => m.key === selectedMetric);
      const result = metric.calculate(x, y);

      const predicted = x.map((xVal) => {
        const prediction = result.predict(xVal);
        return { x: xVal, y: prediction[1] };
      });

      setRegressionResult({
        ...result,
        predicted,
        metricName: metric.name,
        variableName: variables.find((v) => v.key === selectedVariable).name,
        rSquared: result.r2,
        equation: metric.equation(result.equation),
        points: x.map((xVal, i) => ({ x: xVal, y: y[i] })),
        interpretation: metric.interpretation(result.r2),
        coefficients: result.equation,
      });
    } catch (err) {
      setError(`Regression error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const lineChartData = {
    labels: data.map((item) => format(item.date, "MMM dd")),
    datasets: [
      {
        label: "Actual Data",
        data: data.map((item) => item[selectedVariable]),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        pointRadius: 4,
      },
      regressionResult && {
        label: "Regression Line",
        data: regressionResult.predicted.map((p) => p.y),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderWidth: 2,
        pointRadius: 0,
      },
    ].filter(Boolean),
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: regressionResult
          ? `${regressionResult.metricName} for ${regressionResult.variableName}`
          : `${
              variables.find((v) => v.key === selectedVariable).name
            } Over Time`,
      },
    },
  };

  return (
    <div className={styles.container}>
      <AntTitle level={2} className={styles.header}>
        <LineChartOutlined /> Advanced Data Analysis
      </AntTitle>

      {error && <Alert message={error} type="error" showIcon closable />}

      <Row gutter={[16, 16]} className={styles.controls}>
        <Col span={24}>
          <Card title="Analysis Configuration">
            <Row gutter={16}>
              <Col span={12}>
                <Select
                  value={selectedVariable}
                  onChange={setSelectedVariable}
                  style={{ width: "100%" }}
                >
                  {variables.map((v) => (
                    <Option key={v.key} value={v.key}>
                      {v.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={12}>
                <Select
                  value={selectedMetric}
                  onChange={setSelectedMetric}
                  style={{ width: "100%" }}
                  placeholder="Select regression type"
                >
                  {metrics.map((m) => (
                    <Option key={m.key} value={m.key}>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </Row>
            <Button
              type="primary"
              onClick={calculateRegression}
              loading={loading}
              icon={<CalculatorOutlined />}
              style={{ marginTop: 16 }}
            >
              Calculate Regression
            </Button>
          </Card>
        </Col>
      </Row>

      {loading ? (
        <Spin size="large" className={styles.spinner} />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="Regression Analysis">
                <Line data={lineChartData} options={chartOptions} />
              </Card>
            </Col>
          </Row>

          {regressionResult && (
            <>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card title="Regression Results">
                    <Descriptions bordered column={1}>
                      <Descriptions.Item label="Model">
                        {regressionResult.metricName}
                      </Descriptions.Item>
                      <Descriptions.Item label="Variable">
                        {regressionResult.variableName}
                      </Descriptions.Item>
                      <Descriptions.Item label="R² (Coefficient of Determination)">
                        {regressionResult.rSquared.toFixed(4)}
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary">
                            {regressionResult.interpretation}
                          </Text>
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label="Equation">
                        {regressionResult.equation}
                      </Descriptions.Item>
                      <Descriptions.Item label="Coefficients">
                        {regressionResult.coefficients
                          .map((coeff, i) => `β${i}: ${coeff.toFixed(4)}`)
                          .join(", ")}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <Card title="Regression Interpretation">
                    <Descriptions bordered>
                      <Descriptions.Item label="Model Quality">
                        The R² value of {regressionResult.rSquared.toFixed(4)}{" "}
                        indicates that{" "}
                        {(regressionResult.rSquared * 100).toFixed(2)}% of the
                        variance in the dependent variable is explained by the
                        model.
                      </Descriptions.Item>
                      <Descriptions.Item label="Practical Significance">
                        {regressionResult.rSquared > 0.7
                          ? "This model has strong predictive power and can be used for forecasting with reasonable confidence."
                          : regressionResult.rSquared > 0.3
                          ? "This model has moderate predictive power and may be useful for general trend analysis."
                          : "This model has limited predictive power and should be used cautiously."}
                      </Descriptions.Item>
                      <Descriptions.Item label="Next Steps">
                        {regressionResult.rSquared > 0.7
                          ? "Consider using this model for short-term predictions."
                          : "You might want to try a different model or examine if there are other variables that could better explain the variation."}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Locate;
