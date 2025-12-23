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
  const [categoryFilter, setCategoryFilter] = useState(["RAW"]); // Default to RAW only
  const [paperCodeFilter, setPaperCodeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Helper function to format numbers without decimals
  const formatNumber = (num) => {
    return num ? parseFloat(num).toString() : "0";
  };

  // Helper function to safely extract value from potential objects
  const safeValue = (val) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      return val.value || val.label || "-";
    }
    return val;
  };

  // Handle category checkbox toggle
  const handleCategoryToggle = (category) => {
    setCategoryFilter(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
    setCurrentPage(1);
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

        // Fetch orders for customer name
        const ordersSnapshot = await getDocs(collection(db, "ordersTest"));
        const orders = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const stockReport = materials.map((material) => {
          // Match transactions by paperCode for ALL material categories
          const materialTransactions = transactions.filter((t) => {
            // For RAW materials: match against paperProductNo (comma-separated) OR direct paperCode
            if (material.materialCategory === "RAW") {
              // Check direct paperCode match (for issue transactions)
              if (t.paperCode === material.paperCode) {
                return true;
              }
              
              // Check paperProductNo (comma-separated, for consumption transactions)
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

          // ✅ Calculate Total Issue from issue transactions
          const issueTransactions = materialTransactions.filter(
            (t) => t.transactionType === "issue"
          );
          
          const totalIssue = issueTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.usedQty) || 0),
            0
          );

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

          // Find customer name from orders using sourceJobCardNo
          const matchingOrder = orders.find(
            (order) => order.jobCardNo === material.sourceJobCardNo
          );
          const customerName = matchingOrder?.customerName || "-";

          // Find which RAW paper codes were used to create this LO/WIP
          let usedRawPaperCodes = [];
          if (material.materialCategory === "LO" || material.materialCategory === "WIP") {
            const creationTransactions = transactions.filter((t) => {
              if (!t.newPaperCode) return false;
              const newCodes = t.newPaperCode.split(",").map(c => c.trim());
              return newCodes.includes(material.paperCode);
            });

            creationTransactions.forEach((t) => {
              if (t.paperProductNo) {
                const codes = t.paperProductNo.split(",").map(c => c.trim());
                codes.forEach(code => {
                  if (!usedRawPaperCodes.includes(code)) {
                    usedRawPaperCodes.push(code);
                  }
                });
              }
            });
          }

          return {
            id: material.id,
            date: materialDate,
            paperCode: safeValue(material.paperCode) || "-",
            paperProductCode: safeValue(material.paperProductCode) || "-",
            materialCategory: safeValue(material.materialCategory) || "RAW",
            jobPaper: safeValue(material.jobPaper) || "-",
            purchased: isPurchased ? material.totalRunningMeter || 0 : 0,
            created: isCreated ? material.totalRunningMeter || 0 : 0,
            totalIssue: totalIssue, // ✅ New field
            used: totalUsed,
            waste: totalWaste,
            lo: totalLO,
            wip: totalWIP,
            available: material.availableRunningMeter || 0,
            sourceJobCardNo: safeValue(material.sourceJobCardNo) || "-",
            sourceStage: safeValue(material.sourceStage) || "-",
            usedRawPaperCodes: usedRawPaperCodes,
            isActive: material.isActive !== false,
            customerName: safeValue(customerName),
            paperSize: safeValue(material.paperSize) || "-",
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
      item.sourceJobCardNo.toLowerCase().includes(s) ||
      item.customerName.toLowerCase().includes(s);

    if (!matchesSearch) return false;
    if (fromDate && formattedDate < fromDate) return false;
    if (toDate && formattedDate > toDate) return false;
    
    // ✅ Updated: Check if item's category is in the selected categories array
    if (categoryFilter.length > 0 && !categoryFilter.includes(item.materialCategory)) {
      return false;
    }

    // Paper Code History Filter
    if (paperCodeFilter) {
      if (item.paperCode === paperCodeFilter && item.materialCategory === "RAW") {
        return true;
      }
      
      if (
        (item.materialCategory === "LO" || item.materialCategory === "WIP") &&
        item.usedRawPaperCodes.includes(paperCodeFilter)
      ) {
        return true;
      }
      
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
      acc.totalIssue += item.totalIssue; // ✅ New field
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
      totalIssue: 0, // ✅ New field
      used: 0,
      waste: 0,
      loCreated: 0,
      wipCreated: 0,
      available: 0,
    }
  );

  // Get unique paper codes for filter dropdown
  const uniquePaperCodes = [...new Set(
    stockData
      .filter(item => item.materialCategory === "RAW")
      .map(item => item.paperCode)
      .filter(code => code !== "-")
  )].sort();

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Paper Code",
      "Company",
      "Material Type",
      "Category",
      "Customer Name",
      "Paper Size",
      "Purchased",
      "Created",
      "Total Issue",
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
      item.customerName,
      item.paperSize,
      formatNumber(item.purchased),
      formatNumber(item.created),
      formatNumber(item.totalIssue),
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
    <div className=" space-y-3 md:space-y-4 ">
      <h1 className="text-3xl font-bold">Stock Report</h1>
      <hr />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">RAW Purchased</div>
          <h1 className=" font-bold text-blue-600">
            {formatNumber(summaryTotals.purchased)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
        <div className="bg-orange-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Issue</div>
          <h1 className=" font-bold text-orange-600">
            {formatNumber(summaryTotals.totalIssue)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
        <div className="bg-green-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Used (Final)</div>
          <h1 className=" font-bold text-green-600">
            {formatNumber(summaryTotals.used)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
        <div className="bg-red-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Waste</div>
          <h1 className=" font-bold text-red-600">
            {formatNumber(summaryTotals.waste)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
        <div className="bg-yellow-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">LO Created</div>
          <h1 className=" font-bold text-yellow-600">
            {formatNumber(summaryTotals.loCreated)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
        <div className="bg-purple-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">WIP Created</div>
          <h1 className="font-bold text-purple-600">
            {formatNumber(summaryTotals.wipCreated)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
        <div className="bg-indigo-100 p-4 pb-8 rounded-lg shadow">
          <div className="text-xs text-gray-600">Total Available</div>
          <h1 className=" font-bold text-indigo-600">
            {formatNumber(summaryTotals.available)}{" "}
            <span className="text-sm">meter</span>
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Search by Paper Code, Company, Job, Customer..."
            className="border border-black/20 rounded-3xl w-full p-3 pr-10 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* ✅ Category Checkboxes */}
        <div>
          <label className="block mb-2 font-medium">Category</label>
          <div className="flex gap-4 items-center border border-black/20 rounded-2xl p-3 bg-white">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={categoryFilter.includes("RAW")}
                onChange={() => handleCategoryToggle("RAW")}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">RAW</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={categoryFilter.includes("LO")}
                onChange={() => handleCategoryToggle("LO")}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">LO</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={categoryFilter.includes("WIP")}
                onChange={() => handleCategoryToggle("WIP")}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">WIP</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">Paper Code History</label>
          <select
            value={paperCodeFilter}
            onChange={(e) => {
              setPaperCodeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 min-w-[150px]"
          >
            <option value="">All Papers</option>
            {uniquePaperCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium ">From Date</label>
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
          <label className="block mb-2 font-medium ">To Date</label>
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

      {paperCodeFilter && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm">
            <strong>📜 Showing history for Paper Code: {paperCodeFilter}</strong>
            <br />
            Displaying the RAW material and all LO/WIP materials created from it during production stages.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl shadow-lg">
        <table className="table-auto w-full rounded-xl">
          <thead className="bg-gradient-to-t from-[#102F5C] to-[#3566AD]  text-white">
            <tr>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Date</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Paper Code</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Company</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Material Type</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Category</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Customer</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Paper Size</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap bg-blue-900">Purchased</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap bg-blue-900">Created</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap bg-orange-900">Total Issue</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Used</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Waste</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">LO</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">WIP</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Available</th>
              <th className="px-3 py-3 border-r-2 whitespace-nowrap">Source Job</th>
              <th className="px-3 py-3">Source Stage</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item) => (
              <tr className="text-center hover:bg-gray-50" key={item.id}>
                <td className="border px-3 py-2">
                  {item.date.toLocaleDateString("en-IN")}
                </td>
                <td className="border px-3 py-2  font-medium">
                  {item.paperCode}
                </td>
                <td className="border px-3 py-2 ">
                  {item.paperProductCode}
                </td>
                <td className="border px-3 py-2 ">{item.jobPaper}</td>
                <td className="border px-3 py-2">
                  <span
                    className={`px-2 py-1 rounded-full  font-semibold ${
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
                <td className="border px-3 py-2 ">{item.customerName}</td>
                <td className="border px-3 py-2 ">{item.paperSize}</td>
                <td className="border px-3 py-2  font-semibold bg-blue-50">
                  {item.purchased > 0 ? formatNumber(item.purchased) : "-"}
                </td>
                <td className="border px-3 py-2 font-semibold bg-blue-50">
                  {item.created > 0 ? formatNumber(item.created) : "-"}
                </td>
                <td className="border px-3 py-2 font-semibold bg-orange-50 text-orange-600">
                  {formatNumber(item.totalIssue)}
                </td>
                <td className="border px-3 py-2 text-green-600">
                  {formatNumber(item.used)}
                </td>
                <td className="border px-3 py-2 text-red-600">
                  {formatNumber(item.waste)}
                </td>
                <td className="border px-3 py-2 text-yellow-600">
                  {formatNumber(item.lo)}
                </td>
                <td className="border px-3 py-2 text-purple-600">
                  {formatNumber(item.wip)}
                </td>
                <td className="border px-3 py-2 font-bold text-indigo-600">
                  {formatNumber(item.available)}
                </td>
                <td className="border px-3 py-2 ">
                  {item.sourceJobCardNo}
                </td>
                <td className="border px-3 py-2 capitalize">
                  {item.sourceStage}
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan="17" className="text-center p-4 text-gray-500">
                  No stock data found
                </td>
              </tr>
            )}
          </tbody>

          <tfoot className="bg-gray-100 font-bold">
            <tr className="text-center">
              <td colSpan="7" className="border px-3 py-3 text-right">
                TOTALS:
              </td>
              <td className="border px-3 py-3 text-blue-600 bg-blue-50">
                {formatNumber(summaryTotals.purchased)}
              </td>
              <td className="border px-3 py-3 text-blue-600 bg-blue-50">
                {formatNumber(summaryTotals.created)}
              </td>
              <td className="border px-3 py-3 text-orange-600 bg-orange-50">
                {formatNumber(summaryTotals.totalIssue)}
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
        <ul className="space-y-1 ">
          <li>
            <strong>Purchased:</strong> RAW material bought from suppliers
          </li>
          <li>
            <strong>Created:</strong> LO/WIP materials generated during
            production
          </li>
          <li>
            <strong>Total Issue:</strong> Total material issued from stock for production jobs
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
          <li>
            <strong>Paper Code History Filter:</strong> Select a RAW paper code to see its complete journey - the original RAW material purchase and all LO/WIP materials that were created from it during production.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StockReport;