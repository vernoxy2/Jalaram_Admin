import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { FiSearch, FiDownload } from "react-icons/fi";
import { db } from "../../firebase";

const StockReport = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);

        // Use real Firebase data
        const materialsSnapshot = await getDocs(collection(db, "materials"));
        const materials = materialsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const transactionsSnapshot = await getDocs(
          collection(db, "materialTransactions")
        );
        const transactions = transactionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const stockReport = materials.map((material) => {
          // ✅ FIX: Match transactions by paperProductNo (which contains the actual paper codes like "CAP25-001")
          const materialTransactions = transactions.filter((t) => {
            if (material.materialCategory === "RAW") {
              // Match by paperProductNo which contains the actual paper codes
              // t.paperProductNo can be a comma-separated list like "CAP25-001, CAP25-002"
              const transactionPaperCodes = t.paperProductNo 
                ? t.paperProductNo.split(',').map(code => code.trim()) 
                : [];
              
              // Check if this material's paperCode is in the transaction's paperProductNo list
              return transactionPaperCodes.includes(material.paperCode);
            } else if (material.materialCategory === "LO" || material.materialCategory === "WIP") {
              // LO/WIP materials don't have consumption transactions
              // They are created as output, not consumed
              return false;
            }
            return false;
          });

          // Calculate totals from matched transactions
          const totalUsed = materialTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.usedQty) || 0),
            0
          );
          const totalWaste = materialTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.wasteQty) || 0),
            0
          );
          const totalLO = materialTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.loQty) || 0),
            0
          );
          const totalWIP = materialTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.wipQty) || 0),
            0
          );

          const materialDate = material.createdAt
            ? new Date(
                material.createdAt.seconds
                  ? material.createdAt.seconds * 1000
                  : material.createdAt
              )
            : new Date();

          return {
            id: material.id,
            date: materialDate,
            paperCode: material.paperCode || "-",
            paperProductCode: material.paperProductCode || "-",
            materialCategory: material.materialCategory || "RAW",
            jobPaper: material.jobPaper || "-",
            materialIn: material.totalRunningMeter || 0,
            used: totalUsed,
            waste: totalWaste,
            lo: totalLO,
            wip: totalWIP,
            available: material.availableRunningMeter || 0,
            sourceJobCardNo: material.sourceJobCardNo || "-",
            sourceStage: material.sourceStage || "-",
            isActive: material.isActive !== false,
          };
        });

        stockReport.sort((a, b) => b.date - a.date);

        setStockData(stockReport);
      } catch (error) {
        console.error("Error fetching stock data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, []);

  // Filter logic
  const filteredStock = stockData.filter((item) => {
    const formattedDate = item.date.toISOString().split("T")[0];
    const s = search.toLowerCase();

    const matchesSearch =
      item.paperCode.toLowerCase().includes(s) ||
      item.paperProductCode.toLowerCase().includes(s) ||
      item.jobPaper.toLowerCase().includes(s) ||
      item.sourceJobCardNo.toLowerCase().includes(s);

    if (!matchesSearch) return false;
    if (fromDate && formattedDate < fromDate) return false;
    if (toDate && formattedDate > toDate) return false;
    if (categoryFilter !== "ALL" && item.materialCategory !== categoryFilter) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredStock.slice(indexOfFirst, indexOfLast);

  const goToPage = (pageNum) => {
    if (pageNum > 0 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // Calculate totals for summary
  const summaryTotals = filteredStock.reduce(
    (acc, item) => ({
      materialIn: acc.materialIn + item.materialIn,
      used: acc.used + item.used,
      waste: acc.waste + item.waste,
      lo: acc.lo + item.lo,
      wip: acc.wip + item.wip,
      available: acc.available + item.available,
    }),
    { materialIn: 0, used: 0, waste: 0, lo: 0, wip: 0, available: 0 }
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Paper Code",
      "Company",
      "Material Type",
      "Category",
      "Material In",
      "Used",
      "Waste",
      "LO",
      "WIP",
      "Available",
      "Source Job",
      "Source Stage",
    ];

    const rows = filteredStock.map((item) => [
      item.date.toLocaleDateString("en-IN"),
      item.paperCode,
      item.paperProductCode,
      item.jobPaper,
      item.materialCategory,
      item.materialIn,
      item.used,
      item.waste,
      item.lo,
      item.wip,
      item.available,
      item.sourceJobCardNo,
      item.sourceStage,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading stock data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-3xl font-bold">Stock Report (Fixed)</h1>
      <hr />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Material In</div>
          <div className="text-2xl font-bold text-blue-600">
            {summaryTotals.materialIn.toFixed(2)}
          </div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Used</div>
          <div className="text-2xl font-bold text-green-600">
            {summaryTotals.used.toFixed(2)}
          </div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Waste</div>
          <div className="text-2xl font-bold text-red-600">
            {summaryTotals.waste.toFixed(2)}
          </div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total LO</div>
          <div className="text-2xl font-bold text-yellow-600">
            {summaryTotals.lo.toFixed(2)}
          </div>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total WIP</div>
          <div className="text-2xl font-bold text-purple-600">
            {summaryTotals.wip.toFixed(2)}
          </div>
        </div>
        <div className="bg-indigo-100 p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Available</div>
          <div className="text-2xl font-bold text-indigo-600">
            {summaryTotals.available.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Search by Paper Code, Company, Job..."
            className="border border-black/20 rounded-3xl w-full p-3 pr-10 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        <div>
          <label className="block mb-2 font-medium text-sm">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3"
          >
            <option value="ALL">All</option>
            <option value="RAW">RAW</option>
            <option value="LO">LO</option>
            <option value="WIP">WIP</option>
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium text-sm">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-sm">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3"
          />
        </div>

        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-green-700"
        >
          <FiDownload />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow-lg">
        <table className="table-auto w-full rounded-xl">
          <thead className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-sm text-white">
            <tr>
              <th className="px-3 py-3 border-r-2">Date</th>
              <th className="px-3 py-3 border-r-2">Paper Code</th>
              <th className="px-3 py-3 border-r-2">Company</th>
              <th className="px-3 py-3 border-r-2">Material Type</th>
              <th className="px-3 py-3 border-r-2">Category</th>
              <th className="px-3 py-3 border-r-2">Material In</th>
              <th className="px-3 py-3 border-r-2">Used</th>
              <th className="px-3 py-3 border-r-2">Waste</th>
              <th className="px-3 py-3 border-r-2">LO</th>
              <th className="px-3 py-3 border-r-2">WIP</th>
              <th className="px-3 py-3 border-r-2">Available</th>
              <th className="px-3 py-3 border-r-2">Source Job</th>
              <th className="px-3 py-3">Source Stage</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item) => (
              <tr className="text-center hover:bg-gray-50" key={item.id}>
                <td className="border px-3 py-2 text-sm">
                  {item.date.toLocaleDateString("en-IN")}
                </td>
                <td className="border px-3 py-2 text-sm font-medium">
                  {item.paperCode}
                </td>
                <td className="border px-3 py-2 text-sm">
                  {item.paperProductCode}
                </td>
                <td className="border px-3 py-2 text-sm">{item.jobPaper}</td>
                <td className="border px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.materialCategory === "RAW"
                        ? "bg-blue-200 text-blue-800"
                        : item.materialCategory === "LO"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-purple-200 text-purple-800"
                    }`}
                  >
                    {item.materialCategory}
                  </span>
                </td>
                <td className="border px-3 py-2 text-sm font-semibold">
                  {item.materialIn.toFixed(2)}
                </td>
                <td className="border px-3 py-2 text-sm text-green-600">
                  {item.used.toFixed(2)}
                </td>
                <td className="border px-3 py-2 text-sm text-red-600">
                  {item.waste.toFixed(2)}
                </td>
                <td className="border px-3 py-2 text-sm text-yellow-600">
                  {item.lo.toFixed(2)}
                </td>
                <td className="border px-3 py-2 text-sm text-purple-600">
                  {item.wip.toFixed(2)}
                </td>
                <td className="border px-3 py-2 text-sm font-bold text-indigo-600">
                  {item.available.toFixed(2)}
                </td>
                <td className="border px-3 py-2 text-sm">
                  {item.sourceJobCardNo}
                </td>
                <td className="border px-3 py-2 text-sm capitalize">
                  {item.sourceStage}
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan="13" className="text-center p-4 text-gray-500">
                  No stock data found
                </td>
              </tr>
            )}
          </tbody>

          <tfoot className="bg-gray-100 font-bold">
            <tr className="text-center">
              <td colSpan="5" className="border px-3 py-3 text-right">
                TOTALS:
              </td>
              <td className="border px-3 py-3 text-blue-600">
                {summaryTotals.materialIn.toFixed(2)}
              </td>
              <td className="border px-3 py-3 text-green-600">
                {summaryTotals.used.toFixed(2)}
              </td>
              <td className="border px-3 py-3 text-red-600">
                {summaryTotals.waste.toFixed(2)}
              </td>
              <td className="border px-3 py-3 text-yellow-600">
                {summaryTotals.lo.toFixed(2)}
              </td>
              <td className="border px-3 py-3 text-purple-600">
                {summaryTotals.wip.toFixed(2)}
              </td>
              <td className="border px-3 py-3 text-indigo-600">
                {summaryTotals.available.toFixed(2)}
              </td>
              <td colSpan="2" className="border"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-5 justify-center">
        <button
          className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50"
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
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
            onClick={() => goToPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}

        <button
          className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      {/* Summary Info */}
      <div className="bg-blue-50 p-4 rounded-lg mt-6">
        <h3 className="font-bold text-lg mb-2">📊 Understanding the Report</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <strong>Material In:</strong> Initial quantity when material was
            added to inventory
          </li>
          <li>
            <strong>Used:</strong> Quantity consumed from THIS specific material (not cumulative across stages)
          </li>
          <li>
            <strong>Waste:</strong> Wastage generated when THIS material was used
          </li>
          <li>
            <strong>LO (Leftover):</strong> Reusable material generated when THIS material was consumed
          </li>
          <li>
            <strong>WIP (Work in Progress):</strong> Semi-finished material created from THIS material
          </li>
          <li>
            <strong>Available:</strong> Current available quantity in stock
          </li>
          <li>
            <strong>Note:</strong> For RAW materials, Used/Waste/LO/WIP show first stage consumption. LO/WIP materials show their creation quantity in "Material In"
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StockReport;