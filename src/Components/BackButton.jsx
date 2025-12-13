import { useNavigate } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";

const BackButton = ({ label = "Back", className = "" }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`flex items-center gap-1 text-blue-600 hover:underline ${className}`}
    >
      <FaChevronLeft />
      {label}
    </button>
  );
};

export default BackButton;
