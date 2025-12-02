import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { companyList, materialTypeList } from "../utils/constant";
import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import moment from "moment";

const AddMaterial = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // used for edit mode
  const isEdit = Boolean(id);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [companyName, setCompanyName] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [rows, setRows] = useState([{ runningMeter: "", roll: "", total: "" }]);
  const [paperSize, setPaperSize] = useState("");

  /* ---------------------------------------------------
     LOAD DATA IN EDIT MODE
  --------------------------------------------------- */
  useEffect(() => {
    const loadExisting = async () => {
      if (!isEdit) return;

      const ref = doc(db, "materials", id);
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setCompanyName(data.companyName);
        setMaterialType(data.materialType);
        setPaperSize(data.paperSize || "");
        setDate(
          data.date?.seconds
            ? new Date(data.date.seconds * 1000).toISOString().split("T")[0]
            : ""
        );

        setRows([
          {
            runningMeter: data.runningMeter?.toString() || "",
            roll: data.roll?.toString() || "",
            total: data.totalRunningMeter?.toString() || "",
          },
        ]);
      }
    };

    loadExisting();
  }, [id, isEdit]);

  /* ---------------------------------------------------
     HANDLE ROW CHANGES
  --------------------------------------------------- */
  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    const running = Number(updated[index].runningMeter || 0);
    const roll = Number(updated[index].roll || 0);

    updated[index].total = (running * roll).toString();
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { runningMeter: "", roll: "", total: "" }]);
  };
  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(
      updated.length ? updated : [{ runningMeter: "", roll: "", total: "" }]
    );
  };

  /* ---------------------------------------------------
     SUBMIT DATA
  --------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!companyName) {
      alert("Please select company");
      return;
    }

    // 🔥 FILTER ONLY VALID ROWS
    const validRows = rows.filter(
      (r) => r.runningMeter !== "" && r.roll !== ""
    );

    if (validRows.length === 0) {
      alert("Please enter at least one valid row");
      return;
    }

    try {
      /* --------------------------
       EDIT MODE
    -------------------------- */
      if (isEdit) {
        const row = validRows[0]; // Only first row used for edit

        // Company should not change in edit mode
        await updateDoc(doc(db, "materials", id), {
          // companyName, ← REMOVE this to prevent change
          materialType,
          paperSize,
          runningMeter: Number(row.runningMeter),
          roll: Number(row.roll),
          totalRunningMeter: Number(row.total),
          date: new Date(date),
          updatedAt: serverTimestamp(),
        });

        navigate("/material");
        return;
      }

      /* --------------------------
       ADD NEW MATERIALS
    -------------------------- */
      for (const row of validRows) {
        // Take first TWO letters of companyName, uppercase, then add "P"
        const prefix = `${companyName
          .slice(0, 2)
          .toUpperCase()}P${moment().format("YY")}-`;

        const q1 = query(
          collection(db, "materials"),
          where("paperCode", ">=", prefix),
          where("paperCode", "<=", prefix + "\uf8ff")
        );

        const snap = await getDocs(q1);

        let maxNumber = 0;

        snap.forEach((d) => {
          const code = d.data().paperCode;
          const parts = code.split("-");
          if (parts.length === 2 && !isNaN(parts[1])) {
            const num = parseInt(parts[1]);
            if (num > maxNumber) maxNumber = num;
          }
        });

        const nextNumber = String(maxNumber + 1).padStart(3, "0");
        const paperCode = `${prefix}${nextNumber}`;

        await addDoc(collection(db, "materials"), {
          companyName,
          materialType,
          paperSize,
          runningMeter: Number(row.runningMeter),
          roll: Number(row.roll),
          totalRunningMeter: Number(row.total),
          paperCode,
          date: new Date(date),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "Admin",
        });
      }

      alert("Material added successfully");
      navigate("/material");
    } catch (error) {
      console.error(error);
      alert("Error while saving!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 bg-gray-100">
      <h1 className="text-2xl font-bold">
        {isEdit ? "Edit Material" : "Add Material"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-1/3 mt-4">
        {/* DATE */}
        <input
          type="date"
          className="border p-3 rounded-xl"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* COMPANY */}
        <select
          className="border p-3 rounded-xl"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          disabled={isEdit}
        >
          <option value="">Select Company</option>
          {companyList.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* MATERIAL TYPE */}
        <select
          className="border p-3 rounded-xl"
          value={materialType}
          onChange={(e) => setMaterialType(e.target.value)}
        >
          <option value="">Select Material Type</option>
          {materialTypeList.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* PAPER SIZE */}
        <input
          type="text"
          placeholder="Paper Size(mm)"
          className="border p-3 rounded-xl"
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value)}
        />

        {/* MATERIAL DETAILS */}
        <h2 className="text-xl mt-3 font-semibold">Material Details</h2>

        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-4 gap-2 items-center">
            <input
              type="number"
              placeholder="Running Meter"
              className="border p-3 rounded-xl"
              value={row.runningMeter}
              onChange={(e) =>
                handleRowChange(index, "runningMeter", e.target.value)
              }
            />

            <input
              type="number"
              placeholder="Roll"
              className="border p-3 rounded-xl"
              value={row.roll}
              onChange={(e) => handleRowChange(index, "roll", e.target.value)}
            />

            <input
              type="text"
              placeholder="Total"
              className="border p-3 rounded-xl bg-gray-200"
              value={row.total}
              readOnly
            />

            {/* DELETE BUTTON */}
            {!isEdit && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-red-600 font-bold"
              >
                X
              </button>
            )}
          </div>
        ))}

        {!isEdit && (
          <button
            type="button"
            onClick={addRow}
            className="text-blue-600 font-bold underline text-left"
          >
            + Add Row
          </button>
        )}

        {/* SUBMIT */}
        <button className="bg-blue-600 text-white py-3 rounded-xl font-bold">
          {isEdit ? "Update" : "Submit"}
        </button>

        <Link to="/material">
          <div className="bg-gray-300 text-black py-3 px-6 rounded-xl text-center">
            Back
          </div>
        </Link>
      </form>
    </div>
  );
};

export default AddMaterial;
