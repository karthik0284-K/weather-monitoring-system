const SensorCard = ({ data }) => {
    return (
      <div className="bg-white shadow-md p-4 m-4 rounded-lg w-60 text-center">
        <h2 className="text-xl font-bold">{data.type}</h2>
        <p className="text-lg">{data.value}</p>
      </div>
    );
  };
  
  export default SensorCard;
  