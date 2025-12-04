import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { companyList, materialTypeList } from "../../utils/constant";
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
import { db } from "../../firebase";
import moment from "moment";
import PrimaryBtn from "../../Components/PrimaryBtn";
import Addbtn from "../../Components/Addbtn";

const PrimaryInput = ({ type, value, onChange, placeholder }) => {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      className="inputStyle"
    />
  );
};

const AddMaterial = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // used for edit mode
  const isEdit = Boolean(id);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [companyName, setCompanyName] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [rows, setRows] = useState([{ runningMeter: "", roll: "", total: "" }]);

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
    <div className="space-y-5">
      <h1>{isEdit ? "Edit Material" : "Add Material"}</h1>
      <hr />
      <div className="py-16 mt-10 space-y-10 bg-gray-100 container rounded-2xl">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            {/* DATE */}
            <PrimaryInput
              type="date"
              placeholder="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            
            {/* COMPANY */}
            <select
              className="inputStyle"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isEdit}
            >
              <option disabled value="">Select Company Name</option>
              {companyList.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* MATERIAL TYPE */}
            <select
              className="inputStyle"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
            >
              <option disabled value="">Select Material Type</option>
              {materialTypeList.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Paper Size */}
            <PrimaryInput type="number" placeholder="Paper Size" />
          </div>
          <hr />

          {/* MATERIAL DETAILS */}
          <div className="space-y-5">
            <h2>Material Details</h2>

            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center"
              >
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
                  onChange={(e) =>
                    handleRowChange(index, "roll", e.target.value)
                  }
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
              // <button
              //   type="button"
              //   onClick={addRow}
              //   className="text-blue-600 font-bold underline text-left"
              // >
              //   + Add Row
              // </button>
              <Addbtn onClick={addRow}>Add Row</Addbtn>
            )}

            {/* SUBMIT */}
            <PrimaryBtn className="w-full" type="submit">
              {isEdit ? "Update" : "Submit"}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial;
