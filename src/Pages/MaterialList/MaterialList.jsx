import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Addbtn from "../../Components/Addbtn";
import { FiSearch } from "react-icons/fi";
import { RiPencilFill } from "react-icons/ri";

const MaterialList = () => {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(""); // New state for category filter
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [dateError, setDateError] = useState("");

  // Fetch materials
  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "materials"));

      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });

      list.sort((a, b) => {
        const dateA = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt);
        return dateB - dateA;
      });

      setMaterials(list);
    };

    fetchData();
  }, []);

  const filteredMaterials = materials.filter((item) => {
    // Format material date (from createdAt)
    const formattedDate = item.createdAt
      ? new Date(
          item.createdAt.seconds
            ? item.createdAt.seconds * 1000
            : item.createdAt
        )
          .toISOString()
          .split("T")[0]
      : "";

    const s = search.toLowerCase();

    // 🔍 SEARCH filter
    const matchesSearch =
      item.paperCode?.toLowerCase().includes(s) ||
      item.paperProductCode?.toLowerCase().includes(s) ||
      item.jobPaper?.toLowerCase().includes(s) ||
      item.totalRunningMeter?.toString().includes(s) ||
      formattedDate.includes(s);

    if (!matchesSearch) return false;

    // 📅 DATE RANGE FILTER
    // If fromDate selected → only allow materials >= fromDate
    if (fromDate && formattedDate < fromDate) return false;

    // If toDate selected → only allow materials <= toDate
    if (toDate && formattedDate > toDate) return false;

    // 🏷️ CATEGORY FILTER
    // If categoryFilter selected → only show matching category
    if (categoryFilter && item.materialCategory !== categoryFilter) return false;

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;

  const currentItems = filteredMaterials.slice(indexOfFirst, indexOfLast);

  const goToPage = (pageNum) => {
    if (pageNum > 0 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  return (
    <div className="space-y-4">
      <h1>Material In</h1>
      <hr />

      {/* Buttons */}
      <Addbtn to="/material_in/add_material"> Add Material </Addbtn>

      <div className=" relative">
        <input
          type="text"
          placeholder="Search Job"
          className="border border-black/20 rounded-3xl w-full p-3 pr-10 text-sm" // add padding-right for icon
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      <div className="flex gap-10 items-center">
        {/* FROM DATE BUTTON */}
        <div className="relative">
          <label className="block mb-2 font-medium">From Date</label>
          <input
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => {
              const selectedFromDate = e.target.value;

              // ✅ Check if fromDate is after toDate
              if (toDate && selectedFromDate > toDate) {
                setDateError("From Date cannot be after To Date");
                return;
              }

              setDateError(""); // Clear error
              setFromDate(selectedFromDate);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>

        {/* TO DATE BUTTON */}
        <div className="relative">
          <label className="block mb-2 font-medium">To Date</label>
          <input
            type="text"
            value={toDate}
            placeholder="To Date"
            onFocus={(e) => (e.target.type = "date")}
            onBlur={(e) => !e.target.value && (e.target.type = "text")}
            onChange={(e) => {
              const selectedToDate = e.target.value;

              // ✅ Check if toDate is before fromDate
              if (fromDate && selectedToDate < fromDate) {
                setDateError("To Date cannot be before From Date");
                return;
              }

              setDateError(""); // Clear error
              setToDate(selectedToDate);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>

        {/* MATERIAL CATEGORY FILTER DROPDOWN */}
        <div className="relative">
          <label className="block mb-2 font-medium">Material Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          >
            <option value="">All Categories</option>
            <option value="RAW">RAW</option>
            <option value="LO">LO</option>
            <option value="WIP">WIP</option>
          </select>
        </div>
      </div>

      {/* ✅ Show error message if exists */}
      {dateError && (
        <div className="text-red-600 font-medium text-sm">{dateError}</div>
      )}

      <h2>Material List</h2>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow-lg">
        <table className="table-auto w-full rounded-xl">
          <thead className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-xl px-3  text-white">
            <tr>
              <th className="px-3 py-2 border-r-2">Date</th>
              <th className="px-4 py-2 border-r-2">Paper Code</th>
              <th className="px-4 py-2 border-r-2">Company</th>
              <th className="px-4 py-2 border-r-2">Material Type</th>
              <th className="px-4 py-2 border-r-2">Material Category</th>
              <th className="px-4 py-2 border-r-2">Total Running Meter</th>
              <th className="px-4 py-2 border-r-2">Available Running Meter</th>
              <th className="px-4 py-2 ">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item) => (
              <tr className="text-center" key={item.id}>
                <td className="border px-4 py-2">
                  {item.createdAt
                    ? new Date(
                        item.createdAt.seconds
                          ? item.createdAt.seconds * 1000
                          : item.createdAt
                      ).toLocaleDateString("en-IN")
                    : ""}
                </td>

                <td className="border px-4 py-2">{item.paperCode}</td>
                <td className="border px-4 py-2">
                  {item.paperProductCode || "-"}
                </td>
                <td className="border px-4 py-2">{item.jobPaper || "-"}</td>
                <td className="border px-4 py-2">{item.materialCategory || "-"}</td>
                <td className="border px-4 py-2">{item.totalRunningMeter}</td>
                <td className="border px-4 py-2">
                  {item.availableRunningMeter}
                </td>
                <td className="border py-2 text-center space-x-2">
                  {item.materialCategory === "RAW" &&
                  item.availableRunningMeter > 0 ? (
                    <button
                      onClick={() => navigate(`edit/${item.id}`)}
                      className="bg-[#D2D2D2] text-primary p-1 rounded text-2xl"
                    >
                      <RiPencilFill />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center p-4">
                  No materials found
                </td>
              </tr>
            )}
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
              currentPage === i + 1 ? "bg-blue-500 text-white" : ""
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
      <Outlet />
    </div>
  );
};

export default MaterialList;