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

  // Helper function to format numbers without decimals
  const formatNumber = (num) => {
    return num ? parseFloat(num).toString() : "0";
  };

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        setLoading(true);

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
          // Match transactions by paperCode for ALL material categories
          const materialTransactions = transactions.filter((t) => {
            // For RAW materials: match against paperProductNo (comma-separated paper codes)
            if (material.materialCategory === "RAW") {
              const transactionPaperCodes = t.paperProductNo
                ? t.paperProductNo.split(",").map((code) => code.trim())
                : [];
              return transactionPaperCodes.includes(material.paperCode);
            }

            // For LO/WIP materials: match by exact paperCode
            if (
              material.materialCategory === "LO" ||
              material.materialCategory === "WIP"
            ) {
              return (
                t.paperCode === material.paperCode ||
                t.paperProductCode === material.paperCode ||
                t.paperProductNo === material.paperCode
              );
            }

            return false;
          });

          let totalUsed = 0;
          let totalWaste = 0;
          let totalLO = 0;
          let totalWIP = 0;

          if (material.materialCategory === "RAW") {
            // ✅ For RAW: Find the LAST stage where material was used
            const stageOrder = ["printing", "punching", "slitting", "slotting"];

            let lastStage = null;
            for (let i = stageOrder.length - 1; i >= 0; i--) {
              const stageTransactions = materialTransactions.filter(
                (t) => (t.stage || "").toLowerCase() === stageOrder[i]
              );
              if (stageTransactions.length > 0) {
                lastStage = stageOrder[i];
                break;
              }
            }

            // Only count the LAST stage to avoid double counting
            if (lastStage) {
              const lastStageTransactions = materialTransactions.filter(
                (t) => (t.stage || "").toLowerCase() === lastStage
              );

              totalUsed = lastStageTransactions.reduce(
                (sum, t) => sum + (parseFloat(t.usedQty) || 0),
                0
              );
            }

            // Sum waste, LO, WIP across ALL stages (these are actual losses/outputs)
            totalWaste = materialTransactions
              .filter((t) => t.transactionType === "consumption")
              .reduce((sum, t) => sum + (parseFloat(t.wasteQty) || 0), 0);

            totalLO = materialTransactions
              .filter((t) => t.transactionType === "consumption")
              .reduce((sum, t) => sum + (parseFloat(t.loQty) || 0), 0);

            totalWIP = materialTransactions
              .filter((t) => t.transactionType === "consumption")
              .reduce((sum, t) => sum + (parseFloat(t.wipQty) || 0), 0);
          } else if (
            material.materialCategory === "LO" ||
            material.materialCategory === "WIP"
          ) {
            // ✅ For LO/WIP: Only calculate if material has been consumed
            const consumptionTransactions = materialTransactions.filter(
              (t) => t.transactionType === "consumption"
            );

            // ✅ FIX: If no consumption transactions exist, this material hasn't been used yet
            if (consumptionTransactions.length > 0) {
              const created = material.totalRunningMeter || 0;

              totalWaste = consumptionTransactions.reduce(
                (sum, t) => sum + (parseFloat(t.wasteQty) || 0),
                0
              );
              totalLO = consumptionTransactions.reduce(
                (sum, t) => sum + (parseFloat(t.loQty) || 0),
                0
              );
              totalWIP = consumptionTransactions.reduce(
                (sum, t) => sum + (parseFloat(t.wipQty) || 0),
                0
              );

              // ✅ Used = Created - (Waste + LO + WIP)
              totalUsed = created - (totalWaste + totalLO + totalWIP);

              // Ensure used is not negative
              if (totalUsed < 0) totalUsed = 0;
            } else {
              // ✅ Material not consumed yet - all values are 0
              totalUsed = 0;
              totalWaste = 0;
              totalLO = 0;
              totalWIP = 0;
            }
          }

          const materialDate = material.createdAt
            ? new Date(
                material.createdAt.seconds
                  ? material.createdAt.seconds * 1000
                  : material.createdAt
              )
            : new Date();

          const isPurchased = material.materialCategory === "RAW";
          const isCreated =
            material.materialCategory === "LO" ||
            material.materialCategory === "WIP";

          return {
            id: material.id,
            date: materialDate,
            paperCode: material.paperCode || "-",
            paperProductCode: material.paperProductCode || "-",
            materialCategory: material.materialCategory || "RAW",
            jobPaper: material.jobPaper || "-",
            purchased: isPurchased ? material.totalRunningMeter || 0 : 0,
            created: isCreated ? material.totalRunningMeter || 0 : 0,
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

  // Summary totals
  const summaryTotals = filteredStock.reduce(
    (acc, item) => {
      acc.purchased += item.purchased;
      acc.created += item.created;
      acc.used += item.used;
      acc.waste += item.waste;

      if (item.materialCategory === "LO") {
        acc.loCreated += item.created;
      }

      if (item.materialCategory === "WIP") {
        acc.wipCreated += item.created;
      }

      acc.available += item.available;

      return acc;
    },
    {
      purchased: 0,
      created: 0,
      used: 0,
      waste: 0,
      loCreated: 0,
      wipCreated: 0,
      available: 0,
    }
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Paper Code",
      "Company",
      "Material Type",
      "Category",
      "Purchased",
      "Created",
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
      formatNumber(item.purchased),
      formatNumber(item.created),
      formatNumber(item.used),
      formatNumber(item.waste),
      formatNumber(item.lo),
      formatNumber(item.wip),
      formatNumber(item.available),
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
      <h1 className="text-3xl font-bold">Stock Report</h1>
      <hr />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <div className="text-xs text-gray-600">RAW Purchased</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatNumber(summaryTotals.purchased)}{" "}
            <span className="text-sm">meter</span>
          </div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Used (Final)</div>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(summaryTotals.used)}{" "}
            <span className="text-sm">meter</span>
          </div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Waste</div>
          <div className="text-2xl font-bold text-red-600">
            {formatNumber(summaryTotals.waste)}{" "}
            <span className="text-sm">meter</span>
          </div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg shadow">
          <div className="text-xs text-gray-600">LO Created</div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatNumber(summaryTotals.loCreated)}{" "}
            <span className="text-sm">meter</span>
          </div>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg shadow">
          <div className="text-xs text-gray-600">WIP Created</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatNumber(summaryTotals.wipCreated)}{" "}
            <span className="text-sm">meter</span>
          </div>
        </div>
        <div className="bg-indigo-100 p-4 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Available</div>
          <div className="text-2xl font-bold text-indigo-600">
            {formatNumber(summaryTotals.available)}{" "}
            <span className="text-sm">meter</span>
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
              <th className="px-3 py-3 border-r-2 bg-blue-900">Purchased</th>
              <th className="px-3 py-3 border-r-2 bg-blue-900">Created</th>
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
                <td className="border px-3 py-2 text-sm font-semibold bg-blue-50">
                  {item.purchased > 0 ? formatNumber(item.purchased) : "-"}
                </td>
                <td className="border px-3 py-2 text-sm font-semibold bg-blue-50">
                  {item.created > 0 ? formatNumber(item.created) : "-"}
                </td>
                <td className="border px-3 py-2 text-sm text-green-600">
                  {formatNumber(item.used)}
                </td>
                <td className="border px-3 py-2 text-sm text-red-600">
                  {formatNumber(item.waste)}
                </td>
                <td className="border px-3 py-2 text-sm text-yellow-600">
                  {formatNumber(item.lo)}
                </td>
                <td className="border px-3 py-2 text-sm text-purple-600">
                  {formatNumber(item.wip)}
                </td>
                <td className="border px-3 py-2 text-sm font-bold text-indigo-600">
                  {formatNumber(item.available)}
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
                <td colSpan="14" className="text-center p-4 text-gray-500">
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
              <td className="border px-3 py-3 text-blue-600 bg-blue-50">
                {formatNumber(summaryTotals.purchased)}
              </td>
              <td className="border px-3 py-3 text-blue-600 bg-blue-50">
                {formatNumber(summaryTotals.created)}
              </td>
              <td className="border px-3 py-3 text-green-600">
                {formatNumber(summaryTotals.used)}
              </td>
              <td className="border px-3 py-3 text-red-600">
                {formatNumber(summaryTotals.waste)}
              </td>
              <td className="border px-3 py-3 text-yellow-600">
                {formatNumber(summaryTotals.loCreated)}
              </td>
              <td className="border px-3 py-3 text-purple-600">
                {formatNumber(summaryTotals.wipCreated)}
              </td>
              <td className="border px-3 py-3 text-indigo-600">
                {formatNumber(summaryTotals.available)}
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
            <strong>Purchased:</strong> RAW material bought from suppliers
          </li>
          <li>
            <strong>Created:</strong> LO/WIP materials generated during
            production
          </li>
          <li>
            <strong>Used:</strong> For RAW - final output from last stage. For
            LO/WIP - calculated as: Created - (Waste + LO + WIP)
          </li>
          <li>
            <strong>Waste/LO/WIP:</strong> Materials lost or generated at each
            stage
          </li>
          <li>
            <strong>Available:</strong> Current stock available for use
          </li>
          <li className="bg-yellow-50 p-2 rounded mt-2">
            <strong>💡 Formula for LO/WIP:</strong> Used = Created - Waste - LO
            - WIP. This prevents double-counting as material flows through
            stages.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StockReport;
