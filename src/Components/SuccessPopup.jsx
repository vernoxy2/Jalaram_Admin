import { FaCheckCircle } from "react-icons/fa";

const SuccessPopup = ({ show, onClose, message = "Material added successfully!" }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-[320px] text-center shadow-lg animate-scaleIn">
        
        {/* Check Icon */}
        <div className="flex justify-center mb-4">
          <FaCheckCircle className="text-green-500 text-6xl animate-checkBounce" />
        </div>

        {/* Message */}
        <h2 className="text-lg font-semibold mb-2">Success</h2>
        <p className="text-gray-600 mb-5">{message}</p>

        {/* Button */}
        
      </div>
    </div>
  );
};

export default SuccessPopup;
