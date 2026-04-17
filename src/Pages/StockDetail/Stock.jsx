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
  const [categoryFilter, setCategoryFilter] = useState(["RAW"]);
  const [paperCodeFilter, setPaperCodeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [paperSizeFilter, setPaperSizeFilter] = useState("");

  const formatNumber = (num) => {
    return num ? parseFloat(num).toString() : "0";
  };

  const safeValue = (val) => {
    if (val === null || val === undefined) return "-";
    if (
      typeof val === "object" &&
      !Array.isArray(val) &&
      !(val instanceof Date)
    ) {
      return val.value || val.label || "-";
    }
    return val;
  };

  const handleCategoryToggle = (category) => {
    setCategoryFilter((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
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

        const ordersSnapshot = await getDocs(collection(db, "ordersTest"));
        const orders = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const stockReport = materials.map((material) => {
          const materialTransactions = transactions.filter((t) => {
            if (material.materialCategory === "RAW") {
              if (t.paperCode === material.paperCode) {
                return true;
              }
              const transactionPaperCodes = t.paperProductNo
                ? t.paperProductNo.split(",").map((code) => code.trim())
                : [];
              return transactionPaperCodes.includes(material.paperCode);
            }

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

          const issueTransactions = materialTransactions.filter(
            (t) => t.transactionType === "issue" && t.isCancelled !== true
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

            if (lastStage) {
              const lastStageTransactions = materialTransactions.filter(
                (t) => (t.stage || "").toLowerCase() === lastStage
              );

              totalUsed = lastStageTransactions.reduce(
                (sum, t) => sum + (parseFloat(t.usedQty) || 0),
                0
              );
            }

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
            const consumptionTransactions = materialTransactions.filter(
              (t) => t.transactionType === "consumption"
            );

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
              totalUsed = created - (totalWaste + totalLO + totalWIP);

              if (totalUsed < 0) totalUsed = 0;
            } else {
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

          const matchingOrder = orders.find(
            (order) => order.jobCardNo === material.sourceJobCardNo
          );
          const customerName = matchingOrder?.customerName || "-";

          let usedRawPaperCodes = [];
          if (
            material.materialCategory === "LO" ||
            material.materialCategory === "WIP"
          ) {
            const creationTransactions = transactions.filter((t) => {
              if (!t.newPaperCode) return false;
              const newCodes = t.newPaperCode.split(",").map((c) => c.trim());
              return newCodes.includes(material.paperCode);
            });

            creationTransactions.forEach((t) => {
              if (t.paperProductNo) {
                const codes = t.paperProductNo.split(",").map((c) => c.trim());
                codes.forEach((code) => {
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
            totalIssue: totalIssue,
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
    if (paperSizeFilter && item.paperSize !== paperSizeFilter) return false;

    if (
      categoryFilter.length > 0 &&
      !categoryFilter.includes(item.materialCategory)
    ) {
      return false;
    }

    if (paperCodeFilter) {
      if (
        item.paperCode === paperCodeFilter &&
        item.materialCategory === "RAW"
      ) {
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

  // Summary totals - Calculated from ALL stockData to reflect accurate overall stock
  const summaryTotals = stockData.reduce(
    (acc, item) => {
      acc.purchased += item.purchased;
      acc.created += item.created;
      acc.totalIssue += item.totalIssue;
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
      totalIssue: 0,
      used: 0,
      waste: 0,
      loCreated: 0,
      wipCreated: 0,
      available: 0,
    }
  );

  const uniquePaperCodes = [
    ...new Set(
      stockData
        .filter((item) => item.materialCategory === "RAW")
        .map((item) => item.paperCode)
        .filter((code) => code !== "-")
    ),
  ].sort();

  const uniquePaperSizes = [
    ...new Set(
      stockData
        .map((item) => item.paperSize)
        .filter((s) => s && s !== "-")
    ),
  ].sort((a, b) => Number(a) - Number(b));

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
        <div className="bg-teal-100 p-4 pb-6 rounded-lg shadow">
          <div className="text-sm text-gray-600 mb-1">
            No of Paper Size
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-teal-600 text-2xl">
              {filteredStock.length} <span className="text-sm">Rolls</span>
            </h1>
            <div className="text-gray-700 font-medium text-sm mt-1">
              Length:{" "}
              {formatNumber(
                filteredStock.reduce((sum, i) => sum + i.available, 0),
              )}{" "}
              meters
            </div>
          </div>
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

        {/* Category Checkboxes */}
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
          <label className="block mb-2 font-medium ">Paper Size (mm)</label>
          <select
            value={paperSizeFilter}
            onChange={(e) => {
              setPaperSizeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 min-w-[150px]"
          >
            <option value="">All Sizes</option>
            {uniquePaperSizes.map((size) => (
              <option key={size} value={size}>
                {size} mm
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
            <strong>
              📜 Showing history for Paper Code: {paperCodeFilter}
            </strong>
            <br />
            Displaying the RAW material and all LO/WIP materials created from it
            during production stages.
          </p>
        </div>
      )}

      {/* Table */}
     {/* <div className="overflow-x-auto overflow-y-auto max-h-[600px] rounded-2xl shadow-lg border border-gray-200 relative" */}
    <div className="overflow-x-auto rounded-2xl shadow-lg border border-gray-200 relative">
        <table className="table-auto w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-white">
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af] first:rounded-tl-2xl">
                Date
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Paper Code
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Company
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Material Type
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Category
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Customer
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Paper Size
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1a365d]">
                Purchased
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1a365d]">
                Created
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#7c2d12]">
                Total Issue
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Used
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Waste
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                LO
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                WIP
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Available
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-r border-b border-white/20 whitespace-nowrap bg-[#1e40af]">
                Source Job
              </th>
              <th className="sticky top-[80px]  z-20 px-3 py-4 border-b border-white/20 whitespace-nowrap bg-[#1e40af] last:rounded-tr-2xl">
                Source Stage
              </th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item) => (
              <tr className="text-center hover:bg-gray-50 transition-colors" key={item.id}>
                <td className="border-r border-b px-3 py-3 text-sm">
                  {item.date.toLocaleDateString("en-IN")}
                </td>
                <td className="border-r border-b px-3 py-3 font-medium text-sm">
                  {item.paperCode}
                </td>
                <td className="border-r border-b px-3 py-3 text-sm">
                  {item.paperProductCode}
                </td>
                <td className="border-r border-b px-3 py-3 text-sm">
                  {item.jobPaper}
                </td>
                <td className="border-r border-b px-3 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.materialCategory === "RAW"
                        ? "bg-blue-100 text-blue-800"
                        : item.materialCategory === "LO"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {item.materialCategory}
                  </span>
                </td>
                <td className="border-r border-b px-3 py-3 text-sm">
                  {item.customerName}
                </td>
                <td className="border-r border-b px-3 py-3 text-sm">
                  {item.paperSize}
                </td>
                <td className="border-r border-b px-3 py-3 font-semibold bg-blue-50 text-sm">
                  {item.purchased > 0 ? formatNumber(item.purchased) : "-"}
                </td>
                <td className="border-r border-b px-3 py-3 font-semibold bg-blue-50 text-sm">
                  {item.created > 0 ? formatNumber(item.created) : "-"}
                </td>
                <td className="border-r border-b px-3 py-3 font-semibold bg-orange-50 text-orange-600 text-sm">
                  {formatNumber(item.totalIssue)}
                </td>
                <td className="border-r border-b px-3 py-3 text-green-600 text-sm">
                  {formatNumber(item.used)}
                </td>
                <td className="border-r border-b px-3 py-3 text-red-600 text-sm">
                  {formatNumber(item.waste)}
                </td>
                <td className="border-r border-b px-3 py-3 text-yellow-600 text-sm">
                  {formatNumber(item.lo)}
                </td>
                <td className="border-r border-b px-3 py-3 text-purple-600 text-sm">
                  {formatNumber(item.wip)}
                </td>
                <td className="border-r border-b px-3 py-3 font-bold text-indigo-600 text-sm">
                  {formatNumber(item.available)}
                </td>
                <td className="border-r border-b px-3 py-3 text-sm">
                  {item.sourceJobCardNo}
                </td>
                <td className="border-b px-3 py-3 capitalize text-sm">
                  {item.sourceStage}
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan="17" className="text-center p-8 text-gray-500">
                  No stock data found
                </td>
              </tr>
            )}
          </tbody>

          <tfoot className="bg-gray-100 font-bold sticky bottom-0 z-10">
            <tr className="text-center border-t-2 border-gray-300">
              <td colSpan="7" className="border-r px-3 py-4 text-right">
                TOTALS:
              </td>
              <td className="border-r px-3 py-4 text-blue-600 bg-blue-50">
                {formatNumber(summaryTotals.purchased)}
              </td>
              <td className="border-r px-3 py-4 text-blue-600 bg-blue-50">
                {formatNumber(summaryTotals.created)}
              </td>
              <td className="border-r px-3 py-4 text-orange-600 bg-orange-50">
                {formatNumber(summaryTotals.totalIssue)}
              </td>
              <td className="border-r px-3 py-4 text-green-600">
                {formatNumber(summaryTotals.used)}
              </td>
              <td className="border-r px-3 py-4 text-red-600">
                {formatNumber(summaryTotals.waste)}
              </td>
              <td className="border-r px-3 py-4 text-yellow-600">
                {formatNumber(summaryTotals.loCreated)}
              </td>
              <td className="border-r px-3 py-4 text-purple-600">
                {formatNumber(summaryTotals.wipCreated)}
              </td>
              <td className="border-r px-3 py-4 text-indigo-600">
                {formatNumber(summaryTotals.available)}
              </td>
              <td colSpan="2" className="border-l"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-5 justify-center items-center">
        <button
          className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Prev
        </button>

        {(() => {
          let startPage = Math.max(1, currentPage - 2);
          let endPage = Math.min(totalPages, startPage + 4);

          if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
          }

          const pages = [];
          for (let i = startPage; i <= endPage; i++) {
            pages.push(
              <button
                key={i}
                className={`w-10 h-10 border rounded-md transition-all ${
                  currentPage === i
                    ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md scale-110"
                    : "hover:bg-gray-100 text-gray-600 border-gray-300"
                }`}
                onClick={() => goToPage(i)}
              >
                {i}
              </button>
            );
          }
          return pages;
        })()}

        <button
          className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
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
            <strong>Total Issue:</strong> Total material issued from stock for
            production jobs
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
            <strong>Paper Code History Filter:</strong> Select a RAW paper code
            to see its complete journey - the original RAW material purchase and
            all LO/WIP materials that were created from it during production.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StockReport;
