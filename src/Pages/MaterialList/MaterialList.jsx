import React, { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Addbtn from "../../Components/Addbtn";
import { FiSearch } from "react-icons/fi";
import { FaEye } from "react-icons/fa6";
import { RiPencilFill } from "react-icons/ri";

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
              <th className="px-4 py-2 border-r-2">Total Meter</th>
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
                <td className="border px-4 py-2">{item.companyName || "-"}</td>
                <td className="border px-4 py-2">{item.materialType || "-"}</td>
                <td className="border px-4 py-2">{item.totalRunningMeter}</td>
                <td className="border py-2 text-center space-x-2">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-primary text-white p-1 rounded text-2xl"
                  >
                    <FaEye />
                  </button>
                  <button
                    onClick={() => navigate(`edit/${item.id}`)}
                    className="bg-[#D2D2D2] text-primary p-1 rounded text-2xl"
                  >
                    <RiPencilFill />
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
      <Outlet />
    </div>
  );
};

export default MaterialList;
