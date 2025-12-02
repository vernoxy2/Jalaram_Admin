import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const MaterialList = () => {
  const navigate = useNavigate();

  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Search filter
  const filteredMaterials = materials.filter((item) => {
    const s = search.toLowerCase();
    return (
      item.paperCode?.toLowerCase().includes(s) ||
      item.companyName?.toLowerCase().includes(s) ||
      item.materialType?.toLowerCase().includes(s) ||
      item.totalRunningMeter?.toString().includes(s)
    );
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await deleteDoc(doc(db, "materials", id));
      alert("Material deleted successfully");

      // Refresh list after delete
      setMaterials((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error deleting material");
    }
  };

  return (
    <div className="h-screen flex flex-col gap-3 pt-10 justify-start items-center bg-gray-100">
      <h1 className="text-2xl ">Material Page</h1>

      {/* Buttons */}
      <div className="flex gap-10">
        <Link to="/addmaterial">
          <button className="bg-[#3668B1] text-white py-3 px-6 rounded-md">
            Add material
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

      <p className="font-bold mt-5">Material List</p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full rounded-xl">
          <thead className="bg-[#3668B1] text-white">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Paper Code</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Material Type</th>
              <th className="px-4 py-2">Paper Size</th>
              <th className="px-4 py-2">Total Meter</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((item) => (
              <tr key={item.id}>
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
                <td className="border px-4 py-2">{item.companyName || "-"}</td>
                <td className="border px-4 py-2">{item.materialType || "-"}</td>
                <td className="border px-4 py-2">{item.paperSize || "-"}</td>
                <td className="border px-4 py-2">{item.totalRunningMeter}</td>
                <td className="border px-4 py-2 text-center space-x-2">
                  <button
                    onClick={() => navigate(`/material/edit/${item.id}`)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center p-4">
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
    </div>
  );
};

export default MaterialList;
