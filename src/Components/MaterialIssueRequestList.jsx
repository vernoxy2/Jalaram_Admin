import { useState } from "react";
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
    <div className="h-screen flex flex-col gap-3 pt-10 justify-start items-center bg-gray-100">
      <h1 className="text-2xl font-semibold">Material Request List</h1>

      {/* Buttons */}
      <div className="flex gap-10">
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
        />
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

      <p className="font-bold text-lg">All Jobs</p>

      {/* TABLE */}
      <div className="overflow-x-auto px-10">
        <table className="table-auto rounded-xl">
          <thead className="bg-[#3668B1] text-white">
            <tr>
              <th className="px-4 py-2">Job Card No</th>
              <th className="px-4 py-2">Job Name</th>
              <th className="px-4 py-2">Request Date</th>
              <th className="px-4 py-2">Request Type</th>
              <th className="px-4 py-2">Company Name</th>
              <th className="px-4 py-2">Required Material</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border">
                <td className="px-4 py-2">{item.jobCardNo}</td>
                <td className="px-4 py-2">{item.jobName}</td>
                <td className="px-4 py-2">{item.requestDate}</td>
                <td className="px-4 py-2">{item.requestType}</td>
                <td className="px-4 py-2">{item.companyName}</td>
                <td className="px-4 py-2">{item.requiredMaterial}</td>
                <td className="px-4 py-2">
                  <button
                 className="bg-blue-500 text-white px-3 py-1 rounded-lg"
                    onClick={() => navigate(`/materialIssueForm/${item.id}`)}
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
