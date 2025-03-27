import { Line } from "react-chartjs-2";

const LineChart = () => {
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Temperature",
        data: [22, 24, 21, 23, 25],
        borderColor: "blue",
        borderWidth: 2,
      },
    ],
  };

  return <Line data={data} />;
};

export default LineChart;
