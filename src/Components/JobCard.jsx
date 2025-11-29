import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const JobCard = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // const [showFromPicker, setShowFromPicker] = useState(false);
  // const [showToPicker, setShowToPicker] = useState(false);
  const navigate = useNavigate();

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "ordersTest"));
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

      setJobs(list);
    };

    fetchData();
  }, []);

  // Search filter
  // 🔥 Combined FILTER (search + date range)
  const filteredJobs = jobs.filter((item) => {
    // Format job date
    const formattedDate = item.jobDate
      ? new Date(item.jobDate.seconds * 1000).toISOString().split("T")[0]
      : "";

    const s = search.toLowerCase();

    // 🔍 SEARCH filter (jobName, jobCardNo, customerName, jobDate)
    const matchesSearch =
      item.jobName?.toLowerCase().includes(s) ||
      item.jobCardNo?.toLowerCase().includes(s) ||
      item.customerName?.toLowerCase().includes(s) ||
      formattedDate.includes(s);

    if (!matchesSearch) return false;

    // 📅 DATE RANGE FILTER
    // If fromDate selected → only allow jobs >= fromDate
    if (fromDate && formattedDate < fromDate) return false;

    // If toDate selected → only allow jobs <= toDate
    if (toDate && formattedDate > toDate) return false;

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;

  const currentItems = filteredJobs.slice(indexOfFirst, indexOfLast);
  const goToPage = (pageNum) => {
    if (pageNum > 0 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  return (
    <div className="h-screen flex flex-col gap-3 pt-10 justify-start items-center bg-gray-100">
      <h1 className="text-2xl">Job Card</h1>

      {/* Buttons */}
      <div className="flex gap-10">
        <Link to="/addjob">
          <button className="bg-[#3668B1] text-white py-3 px-6 rounded-md">
            Add New Job
          </button>
        </Link>

        <Link to="/">
          <button className="bg-[#EFEDED] text-black border hover:border-black duration-200 py-3 px-6 rounded-md">
            Back to Home
          </button>
        </Link>
      </div>

      {/* Search */}
      <div className="w-80">
        <input
          type="text"
          placeholder="Search"
          className="border border-black/20 rounded-2xl w-full p-3"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1); // Reset to page 1 when searching
          }}
        />
      </div>

      {/* Buttons */}
      {/* Date Filter Buttons */}
      <div className="flex gap-10 items-center">
        {/* FROM DATE BUTTON */}
        <div className="relative">
          {/* <button
            className="bg-[#3668B1] text-white py-3 px-6 rounded-md"
            onClick={() => setShowFromPicker(true)}
          >
            {fromDate ? `From: ${formatDate(fromDate)}` : "From Date"}
          </button>

          {showFromPicker && (
            <input
              type="date"
              className="absolute top-14 left-0 border p-2 rounded-md bg-white"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setShowFromPicker(false);
                setCurrentPage(1);
              }}
            />
          )} */}
          <label className="block mb-2 font-medium">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>

        {/* TO DATE BUTTON */}
        <div className="relative">
          {/* <button
            className="bg-[#EFEDED] text-black border hover:border-black duration-200 py-3 px-6 rounded-md"
            onClick={() => setShowToPicker(true)}
          >
            {toDate ? `To: ${formatDate(toDate)}` : "To Date"}
          </button>

          {showToPicker && (
            <input
              type="date"
              className="absolute top-14 left-0 border p-2 rounded-md bg-white"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setShowToPicker(false);
                setCurrentPage(1);
              }}
            />
          )} */}
          <label className="block mb-2 font-medium">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>
      </div>

      <p className="font-bold">All Jobs</p>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full rounded-xl">
          <thead className="bg-[#3668B1] text-white">                                                                              
            <tr>
              <th className="px-4 py-2">Job Card No</th>
              <th className="px-4 py-2">Job Name</th>
              <th className="px-4 py-2">Customer Name</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((job) => (
              <tr
                key={job.id}
                onClick={() => navigate(`/jobDetailScreen/${job.id}`)}
                className="cursor-pointer hover:bg-gray-100"
              >
                <td className="border px-4 py-2">{job.jobCardNo}</td>
                <td className="border px-4 py-2">{job.jobName}</td>
                <td className="border px-4 py-2">{job.customerName}</td>
                <td className="border px-4 py-2">
                  {job.jobDate
                    ? new Date(job.jobDate.seconds * 1000)
                        .toISOString()
                        .split("T")[0]
                    : ""}
                </td>
                <td className="border px-4 py-2">{job.status || "Pending"}</td>

                {/* PREVENT ROW CLICK HERE */}
                <td
                  className="border px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {job.jobStatus?.toLowerCase() !== "completed" && (
                    <Link to={`/addjob/${job.id}`}>
                      <button className="bg-[#3668B1] text-white py-3 px-6 rounded-md">
                        Edit
                      </button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}

            {jobs.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No jobs found.
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
    </div>
  );
};

export default JobCard;
