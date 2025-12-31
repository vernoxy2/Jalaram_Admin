import { useEffect, useState, useRef } from "react";
import { FiSearch } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const MaterialIssueRequestList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateError, setDateError] = useState("");
  const [highlightId, setHighlightId] = useState(
    location.state?.highlightId || null
  );
  const rowRefs = useRef({});

  const itemsPerPage = 10;

  // Handle highlight from notification
  useEffect(() => {
    if (highlightId) {
      // Scroll to the highlighted row after a short delay
      const scrollTimer = setTimeout(() => {
        const element = rowRefs.current[highlightId];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      // Remove highlight after 3 seconds
      const highlightTimer = setTimeout(() => {
        setHighlightId(null);
      }, 3000);

      // Clear the location state
      window.history.replaceState({}, document.title);

      // Cleanup timers
      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(highlightTimer);
      };
    }
  }, [highlightId]);

  // FETCH MATERIAL REQUEST DATA
  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "materialRequest"));
      const list = [];

      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));

      list.sort((a, b) => {
        const dateA = a.createdAt?.seconds
          ? new Date(a.createdAt.seconds * 1000)
          : new Date(a.createdAt);

        const dateB = b.createdAt?.seconds
          ? new Date(b.createdAt.seconds * 1000)
          : new Date(b.createdAt);

        return dateB - dateA;
      });

      setData(list);
    };

    fetchData();
  }, []);

  const filteredItems = data.filter((item) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt.seconds * 1000).toISOString().split("T")[0]
      : "";

    const s = search.toLowerCase();

    // search filter
    const matchesSearch =
      item.jobCardNo?.toLowerCase().includes(s) ||
      item.jobName?.toLowerCase().includes(s) ||
      item.requiredMaterial?.toLowerCase().includes(s) ||
      item.createdBy?.toLowerCase().includes(s) ||
      formattedDate.includes(s);

    if (!matchesSearch) return false;

    // date filters
    if (fromDate && formattedDate < fromDate) return false;
    if (toDate && formattedDate > toDate) return false;

    return true;
  });

  // PAGINATION
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;

  const currentItems = filteredItems.slice(indexOfFirst, indexOfLast);

  const goToPage = (page) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  // Helper function to determine if "Issue Now" button should be shown
  const shouldShowIssueButton = (item) => {
    const requiredMaterial = Number(item.requiredMaterial || 0);
    const issuedMeter = Number(item.issuedMeter || 0);
    const isIssued = item.isIssued === true;

    // Show button if material is NOT fully issued
    // Hide button only if: requiredMaterial <= issuedMeter AND isIssued = true
    return !(requiredMaterial <= issuedMeter && isIssued);
  };

  return (
    <div className="space-y-3 md:space-y-4 max-w-full overflow-hidden">
      <h1>Material Request List</h1>

      <hr />
      {/* Search */}
      <div className="w-full relative">
        <input
          type="text"
          placeholder="Search"
          className="border border-black/20 rounded-3xl w-full p-3 pr-10 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {/* Date Filter */}
      <div className="space-y-2">
        <div className="space-y-3 md:space-y-0 md:flex flex-wrap gap-5 items-center">
          <div className="relative">
            <label className="block mb-2 font-medium">From Date</label>
            <input
              type="date"
              className="border border-black/20 rounded-2xl p-3 w-full"
              value={fromDate}
              onChange={(e) => {
                const newFromDate = e.target.value;
                setFromDate(newFromDate);
                setCurrentPage(1);

                // Validate: fromDate should be less than toDate
                if (toDate && newFromDate > toDate) {
                  setDateError(
                    "From Date must be less than or equal to To Date"
                  );
                } else {
                  setDateError("");
                }
              }}
            />
          </div>

          <div className="relative">
            <label className="block mb-2 font-medium">To Date</label>
            <input
              type="date"
              className="border border-black/20 rounded-2xl p-3 w-full"
              value={toDate}
              onChange={(e) => {
                const newToDate = e.target.value;
                setToDate(newToDate);
                setCurrentPage(1);

                // Validate: toDate should be greater than fromDate
                if (fromDate && newToDate < fromDate) {
                  setDateError(
                    "To Date must be greater than or equal to From Date"
                  );
                } else {
                  setDateError("");
                }
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {dateError && <p className="text-red-600 text-sm">{dateError}</p>}
      </div>
      <h2 className="font-bold text-lg">All Jobs</h2>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-2xl shadow-lg ">
        <div className="max-w-1 inline-block align-middle">
        <table className="table-auto rounded-xl min-w-1">
          <thead className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] md:text-xl px-3 text-white">
            <tr>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Job Card No
              </th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Job Name
              </th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Customer Name
              </th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Request Date
              </th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Required Material
              </th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Issued Material
              </th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">
                Request By
              </th>
              <th className="px-2 md:px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center p-8 text-gray-500">
                  <div className="font-medium">No request found.</div>
                </td>
              </tr>
            ) : (
              currentItems.map((item, index) => {
                const issuedMeter = Number(item.issuedMeter || 0);
                const isHighlighted = highlightId === item.id;

                return (
                  <tr
                    key={index}
                    ref={(el) => (rowRefs.current[item.id] = el)}
                    className={`border text-center transition-all duration-300 ${
                      isHighlighted
                        ? "bg-yellow-100 shadow-lg scale-[1.02]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="border px-4 py-2">{item.jobCardNo}</td>
                    <td className="border px-4 py-2">{item.jobName}</td>
                    <td className="border px-4 py-2">
                      {item.customerName ?? "-"}
                    </td>
                    <td className="border px-4 py-2">
                      {item.createdAt
                        ? new Date(item.createdAt.seconds * 1000)
                            .toISOString()
                            .split("T")[0]
                        : ""}
                    </td>
                    <td className="border px-4 py-2">
                      {item.requiredMaterial
                        ? parseFloat(item.requiredMaterial).toString()
                        : ""}
                    </td>
                    <td className="border px-4 py-2">{issuedMeter}</td>
                    <td className="border px-4 py-2">{item.createdBy}</td>

                    Action Column
                    <td className="border px-4 py-2">
                      {shouldShowIssueButton(item) ? (
                        <button
                          className="bg-[#D2D2D2]/40 border hover:border-primary font-semibold text-primary px-3 py-1 rounded-lg"
                          onClick={() => navigate(`/issue_material/${item.id}`)}
                        >
                          Issue Now
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-5">
        <button
          className="px-4 py-2 border rounded-md"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={`px-4 py-2 border rounded-md ${
              currentPage === i + 1 ? "bg-primary text-white" : ""
            }`}
            onClick={() => goToPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}

        <button
          className="px-4 py-2 border rounded-md"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default MaterialIssueRequestList;
