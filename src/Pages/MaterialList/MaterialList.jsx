import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Addbtn from "../../Components/Addbtn";
import { FiSearch } from "react-icons/fi";
import { RiPencilFill } from "react-icons/ri";
import { FaSortAmountDown, FaSortAmountUp } from "react-icons/fa";

const MaterialList = () => {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState("raw"); // 'raw' or 'created'
  
  // Search and filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(""); // Only for created tab
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc'
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [dateError, setDateError] = useState("");

  // ✅ Helper function to safely extract string value from object or string
  const getDisplayValue = (value) => {
    if (!value) return "-";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      // Handle {label, value} objects
      return value.label || value.value || "-";
    }
    return String(value);
  };

  // Fetch materials
  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "materials"));

      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });

      setMaterials(list);
    };

    fetchData();
  }, []);

  // Reset filters when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch("");
    setFromDate("");
    setToDate("");
    setCategoryFilter("");
    setSortOrder("desc");
    setCurrentPage(1);
    setDateError("");
  };

  // Filter materials based on active tab
  const getFilteredMaterials = () => {
    let filtered = materials.filter((item) => {
      // Tab-specific filtering
      if (activeTab === "raw") {
        if (item.materialCategory !== "RAW") return false;
      } else {
        // created tab - only LO and WIP
        if (!["LO", "WIP"].includes(item.materialCategory)) return false;
      }

      // Format material date
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

      // ✅ Extract string values for search
      const paperCodeStr = getDisplayValue(item.paperCode).toLowerCase();
      const paperProductCodeStr = getDisplayValue(item.paperProductCode).toLowerCase();
      const jobPaperStr = getDisplayValue(item.jobPaper).toLowerCase();

      // Search filter
      const matchesSearch =
        paperCodeStr.includes(s) ||
        paperProductCodeStr.includes(s) ||
        jobPaperStr.includes(s) ||
        item.totalRunningMeter?.toString().includes(s) ||
        formattedDate.includes(s);

      if (!matchesSearch) return false;

      // Date range filter
      if (fromDate && formattedDate < fromDate) return false;
      if (toDate && formattedDate > toDate) return false;

      // Category filter (only for created tab)
      if (activeTab === "created" && categoryFilter && item.materialCategory !== categoryFilter) {
        return false;
      }

      return true;
    });

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt);
      
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const filteredMaterials = getFilteredMaterials();

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

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-2 md:space-y-4">
      <h1>Material In</h1>
      <hr />

      {/* Add Material Button */}
      <Addbtn to="/material_in/add_material">Add Material</Addbtn>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => handleTabChange("raw")}
          className={`px-6 py-3 font-medium transition-all whitespace-nowrap ${
            activeTab === "raw"
              ? "text-[#3566AD] border-b-4 border-[#3566AD]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Raw Material
        </button>
        <button
          onClick={() => handleTabChange("created")}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === "created"
              ? "text-[#3566AD] border-b-4 border-[#3566AD]"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Created Material (LO/WIP)
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by Paper Code, Company, Material Type..."
          className="border border-black/20 rounded-3xl w-full p-3 pr-10 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {/* Filters */}
      <div className="flex gap-6 items-end flex-wrap">
        {/* From Date */}
        <div className="flex-1 min-w-[200px]">
          <label className="block mb-2 font-medium text-base">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              const selectedFromDate = e.target.value;
              if (toDate && selectedFromDate > toDate) {
                setDateError("From Date cannot be after To Date");
                return;
              }
              setDateError("");
              setFromDate(selectedFromDate);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>

        {/* To Date */}
        <div className="flex-1 min-w-[200px]">
          <label className="block mb-2 font-medium text-base">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              const selectedToDate = e.target.value;
              if (fromDate && selectedToDate < fromDate) {
                setDateError("To Date cannot be before From Date");
                return;
              }
              setDateError("");
              setToDate(selectedToDate);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>

        {/* Material Category - Only for Created Tab */}
        {activeTab === "created" && (
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-2 font-medium text-base">Material Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-black/20 rounded-2xl p-3 w-full"
            >
              <option value="">All Categories</option>
              <option value="LO">LO</option>
              <option value="WIP">WIP</option>
            </select>
          </div>
        )}

        {/* Sort Order Toggle */}
        <div className="flex-shrink-0">
          <label className="block mb-2 font-medium text-base">Sort by Date</label>
          <button
            onClick={toggleSortOrder}
            className="border border-black/20 rounded-2xl p-3 px-6 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            title={sortOrder === "desc" ? "Newest First" : "Oldest First"}
          >
            {sortOrder === "desc" ? (
              <>
                <FaSortAmountDown className="text-lg" />
                <span className="text-sm">Newest First</span>
              </>
            ) : (
              <>
                <FaSortAmountUp className="text-lg" />
                <span className="text-base">Oldest First</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Date Error Message */}
      {dateError && (
        <div className="text-red-600 font-medium text-sm bg-red-50 p-3 rounded-lg">
          {dateError}
        </div>
      )}

      {/* Results Count */}
      <div className="text-base text-gray-600">
        Showing {currentItems.length} of {filteredMaterials.length} materials
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow-lg">
        <table className="table-auto w-full rounded-xl">
          <thead className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-xl px-3 text-white">
            <tr>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">Date</th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">Paper Code</th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">Company</th>
              <th className="px-2 md:px-4 py-2 border-r-2 whitespace-nowrap">Material Type</th>
              {activeTab === "created" && (
                <>
                  <th className="px-4 py-2 border-r-2 whitespace-nowrap">Material Category</th>
                  <th className="px-4 py-2 border-r-2 whitespace-nowrap">Source Job</th>
                  <th className="px-4 py-2 border-r-2 whitespace-nowrap">Source Stage</th>
                </>
              )}
              <th className="px-4 py-2 border-r-2 whitespace-pre">Total Running Meter</th>
              <th className="px-4 py-2 border-r-2 whitespace-pre">Available Running Meter</th>
              <th className="px-4 py-2 whitespace-pre">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item) => (
              <tr className="text-center hover:bg-gray-50" key={item.id}>
                <td className="border px-2 md:px-4 py-2">
                  {item.createdAt
                    ? new Date(
                        item.createdAt.seconds
                          ? item.createdAt.seconds * 1000
                          : item.createdAt
                      ).toLocaleDateString("en-IN")
                    : ""}
                </td>
                <td className="border px-2 md:px-4 py-2">{getDisplayValue(item.paperCode)}</td>
                <td className="border px-2 md:px-4 py-2">
                  {getDisplayValue(item.paperProductCode)}
                </td>
                <td className="border px-2 md:px-4 py-2">{getDisplayValue(item.jobPaper)}</td>
                {activeTab === "created" && (
                  <>
                    <td className="border px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium ${
                          item.materialCategory === "LO"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {item.materialCategory}
                      </span>
                    </td>
                    <td className="border px-2 md:px-4 py-2">
                      {item.sourceJobCardNo || "-"}
                    </td>
                    <td className="border px-2 md:px-4 py-2">
                      <span className="capitalize">
                        {item.sourceStage || "-"}
                      </span>
                    </td>
                  </>
                )}
                <td className="border px-2 md:px-4 py-2">{item.totalRunningMeter}</td>
                <td className="border px-2 md:px-4 py-2">
                  {item.availableRunningMeter}
                </td>
                <td className="border py-2 text-center space-x-2">
                  {activeTab === "raw" && item.availableRunningMeter > 0 ? (
                    <button
                      onClick={() => navigate(`edit/${item.id}`)}
                      className="bg-[#D2D2D2] text-primary p-1 rounded text-2xl hover:bg-gray-400 transition-colors"
                      title="Edit Material"
                    >
                      <RiPencilFill />
                    </button>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td
                  colSpan={activeTab === "created" ? "10" : "7"}
                  className="text-center p-8 text-gray-500"
                >
                  <div className="text-4xl mb-2">📦</div>
                  <div className="font-medium">No materials found</div>
                  <div className="text-sm mt-1">
                    Try adjusting your search or filter criteria
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-5 justify-center items-center flex-wrap">
        <button
          className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            className={`px-4 py-2 border rounded-md ${
              currentPage === i + 1
                ? "bg-[#3566AD] text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => goToPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}

        <button
          className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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