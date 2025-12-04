import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const MaterialIssueRequestList = () => {
  const navigate = useNavigate();
  // Dummy Data
  const [data] = useState([
    {
      id: 1,
      jobCardNo: "JC-001",
      jobName: "Visiting Card Printing",
      requestDate: "2025-01-10",
      requestType: "WIP",
      companyName: "Sun Paper",
      requiredMaterial: "1000",
    },
    {
      id: 2,
      jobCardNo: "JC-002",
      jobName: "Brochure Design",
      requestDate: "2025-01-12",
      requestType: "Additional",
      companyName: "Krutika",
      requiredMaterial: "2000",
    },
    {
      id: 3,
      jobCardNo: "JC-003",
      jobName: "Sticker Labels",
      requestDate: "2025-01-15",
      requestType: "Additional",
      companyName: "Capri",
      requiredMaterial: "1000",
    },
  ]);

  return (
    <div className="space-y-5">
      <h1>Material Request List</h1>

      <hr />

      {/* Search */}
      <div className="w-full relative">
        <input
          type="text"
          placeholder="Search"
          className="border border-black/20 rounded-3xl w-full p-3 pr-10 text-sm"
        />
        <FiSearch  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

      {/* Date Filter */}
      <div className="flex gap-10 items-center">
        <div className="relative">
          <label className="block mb-2 font-medium">From Date</label>
          <input
            type="date"
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>

        <div className="relative">
          <label className="block mb-2 font-medium">To Date</label>
          <input
            type="date"
            className="border border-black/20 rounded-2xl p-3 w-full"
          />
        </div>
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
              <th className="px-4 py-2 border-r-2">Request Type</th>
              <th className="px-4 py-2 border-r-2">Company Name</th>
              <th className="px-4 py-2 border-r-2">Required Material</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border text-center">
                <td className="border px-4 py-2">{item.jobCardNo}</td>
                <td className="border px-4 py-2">{item.jobName}</td>
                <td className="border px-4 py-2">{item.requestDate}</td>
                <td className="border px-4 py-2">{item.requestType}</td>
                <td className="border px-4 py-2">{item.companyName}</td>
                <td className="border px-4 py-2">{item.requiredMaterial}</td>
                <td className="border px-4 py-2">
                  <button
                 className="bg-primary text-white px-3 py-1 rounded-lg"
                    onClick={() => navigate(`${item.id}`)}
                  >
                    Issue Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-5">
        <button className="px-4 py-2 border rounded-md">Prev</button>
        <button className="px-4 py-2 border rounded-md">Next</button>
      </div>
    </div>
  );
};

export default MaterialIssueRequestList;