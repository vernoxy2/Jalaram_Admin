import { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const MaterialIssueRequestList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateError, setDateError] = useState("");

  const itemsPerPage = 10;

  // 🔥 FETCH MATERIAL REQUEST DATA
  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "materialRequest"));
      const list = [];

      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));

      // Sort by requestDate (latest first)
      list.sort((a, b) => {
        const dateA = a.requestDate?.seconds
          ? new Date(a.requestDate.seconds * 1000)
          : new Date(a.requestDate);

        const dateB = b.requestDate?.seconds
          ? new Date(b.requestDate.seconds * 1000)
          : new Date(b.requestDate);

        return dateB - dateA;
      });

      setData(list);
    };

    fetchData();
  }, []);

  const filteredItems = data.filter((item) => {
    // 🔥 Use createdAt instead of requestDate (to match what's displayed)
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

  // 🔢 PAGINATION
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;

  const currentItems = filteredItems.slice(indexOfFirst, indexOfLast);

  const goToPage = (page) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="space-y-5  max-w-full overflow-hidden">
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
        <div className="flex gap-10 items-center">
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
      <div className="overflow-x-auto rounded-2xl shadow-lg w-fit">
        <table className="table-auto rounded-xl">
          <thead className="bg-gradient-to-t from-[#102F5C] to-[#3566AD]  text-xl px-3 text-white">
            <tr>
              <th className="px-4 py-2 border-r-2">Job Card No</th>
              <th className="px-4 py-2 border-r-2">Job Name</th>
              <th className="px-4 py-2 border-r-2">Request Date</th>
              <th className="px-4 py-2 border-r-2">Required Material</th>
              <th className="px-4 py-2 border-r-2">Issued Material</th>
              <th className="px-4 py-2 border-r-2">Request By</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item, index) => (
              <tr key={index} className="border text-center">
                <td className="border px-4 py-2">{item.jobCardNo}</td>
                <td className="border px-4 py-2">{item.jobName}</td>
                <td className="border px-4 py-2">
                  {item.createdAt
                    ? new Date(item.createdAt.seconds * 1000)
                        .toISOString()
                        .split("T")[0]
                    : ""}
                </td>
                {/* <td className="border px-4 py-2">{item.requiredMaterial}</td> */}
                <td className="border px-4 py-2">
                  {item.requiredMaterial
                    ? parseFloat(item.requiredMaterial).toString()
                    : ""}
                </td>
                <td className="border px-4 py-2">
                  {item.issuedMeter ? item.issuedMeter : 0}
                </td>
                <td className="border px-4 py-2">{item.createdBy}</td>

                <td className="border px-4 py-2">
                  {!item.isIssued ? (
                    <button
                      className="bg-[#D2D2D2]/40 border hover:border-primary font-semibold text-primary px-3 py-1 rounded-lg"
                      // onClick={() => navigate(`${item.id}`)}
                      onClick={() => navigate(`/issue_material/${item.id}`)}
                    >
                      Issue Now
                    </button>
                  ) : (
                    <></>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
