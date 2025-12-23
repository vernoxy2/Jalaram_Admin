import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { materialTypeList, paperProductCodeData } from "../../utils/constant";
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
import BackButton from "../../Components/BackButton";
import SuccessPopup from "../../Components/SuccessPopup";


const PrimaryInput = ({
  type = "text",
  value,
  onChange,
  name,
  label,
  readOnly,
  error,
  className,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "" && value !== null && value !== undefined;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        name={name}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        readOnly={readOnly}
        className={`inputStyle peer ${error ? "border-red-500" : ""} ${
          readOnly ? "bg-gray-50 cursor-not-allowed" : ""
        }`}
      />
      <label
        className={`absolute left-3 transition-all duration-200 pointer-events-none ${
          isFocused || hasValue
            ? "-top-2.5 text-xs text-gray-600 font-medium bg-white px-1 py-0.5 rounded-sm"
            : `top-1/2 -translate-y-1/2 text-gray-500 ${className}`
        }`}
      >
        {label}
      </label>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
};

const PrimarySelect = ({
  value,
  onChange,
  name,
  label,
  options,
  error,
  required = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "" && value !== null && value !== undefined;

  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`inputStyle peer ${error ? "border-red-500" : ""}`}
      >
        <option value=""></option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <label
        className={`absolute left-3 transition-all duration-200 pointer-events-none ${
          isFocused || hasValue
            ? "-top-2 text-xs text-gray-800 font-medium bg-white px-1 py-0.5 rounded-sm "
            : "top-1/2 -translate-y-1/2 text-gray-500"
        }`}
      >
        {label} {required && "*"}
      </label>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
};

const AddMaterial = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paperProductCode, setPaperProductCode] = useState("");
  const [jobPaper, setJobPaper] = useState("");
  const [rows, setRows] = useState([{ runningMeter: "", roll: "", total: "" }]);
  const [paperSize, setPaperSize] = useState("");
  const [errors, setErrors] = useState({});
  const [showPopup, setShowPopup] = useState(false);

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
        setPaperProductCode(data.paperProductCode);
        setJobPaper(data.jobPaper);
        setDate(
          data.date?.seconds
            ? new Date(data.date.seconds * 1000).toISOString().split("T")[0]
            : ""
        );
        setPaperSize(data.paperSize || "");

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
    const newErrors = {};

    if (!paperProductCode) {
      newErrors.paperProductCode = "Please select company name";
    }

    if (!jobPaper) {
      newErrors.jobPaper = "Please select material type";
    }

    const validRows = rows.filter(
      (r) => r.runningMeter !== "" && r.roll !== ""
    );

    if (validRows.length === 0) {
      newErrors.rows = "Please enter at least one valid row";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      /* --------------------------
       EDIT MODE
    -------------------------- */
      if (isEdit) {
        const row = validRows[0];

        // ⚠️ In edit mode, we update totalRunningMeter and availableRunningMeter
        // Only if this is a RAW material that hasn't been issued yet
        await updateDoc(doc(db, "materials", id), {
          jobPaper,
          runningMeter: Number(row.runningMeter),
          roll: Number(row.roll),
          totalRunningMeter: Number(row.total),
          // ✅ NEW: Update availableRunningMeter (only if not already issued)
          availableRunningMeter: Number(row.total),
          date: new Date(date),
          updatedAt: serverTimestamp(),
        });

        setShowPopup(true);
        setTimeout(() => navigate("/material_in"), 1200);
        return;
      }

      /* --------------------------
       ADD NEW MATERIALS
    -------------------------- */
      for (const row of validRows) {
        // Generate paper code
        const prefix = `${paperProductCode
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

        // ✅ NEW: Add new fields for stock management
        await addDoc(collection(db, "materials"), {
          paperProductCode,
          jobPaper,
          paperSize,
          runningMeter: Number(row.runningMeter),
          roll: Number(row.roll),
          totalRunningMeter: Number(row.total),

          // ✅ NEW FIELDS:
          availableRunningMeter: Number(row.total), // Initially same as total
          materialCategory: "RAW", // All new materials are RAW
          isActive: true, // Active by default

          // ✅ Source tracking (null for RAW materials)
          sourceJobCardNo: null,
          sourcePaperCode: null,
          sourceStage: null,

          paperCode,
          date: new Date(date),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "Admin",
        });
      }
      setShowPopup(true);
      setTimeout(() => navigate("/material_in"), 1200);
    } catch (error) {
      console.error(error);
      alert("Error while saving!");
    }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex justify-between items-baseline">
          <h1>{isEdit ? "Edit Material" : "Add Material"}</h1>
          <BackButton />
        </div>
        <hr />
        <div className="py-16 mt-10 space-y-10 bg-gray-100 container rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              {/* DATE */}
              <PrimaryInput
                type="date"
                label="Date"
                value={date}
                name="Date"
                className="hidden"
                placeholder="Date"
                onChange={(e) => setDate(e.target.value)}
              />

              {/* COMPANY */}
              {/* <div>
                <select
                  className="inputStyle"
                  value={paperProductCode}
                  onChange={(e) => {
                    setPaperProductCode(e.target.value);
                    setErrors((prev) => ({ ...prev, paperProductCode: "" }));
                  }}
                  disabled={isEdit}
                >
                  <option disabled value="">
                    Select Company Name
                  </option>
                  {paperProductCodeData.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {errors.paperProductCode && (
                  <p className="text-red-600 text-sm">
                    {errors.paperProductCode}
                  </p>
                )}
              </div> */}
              {/* company */}
              <PrimarySelect
                label="Company"
                options={paperProductCodeData}
                value={paperProductCode}
                onChange={(e) => setPaperProductCode(e.target.value)}
              />

              {/* MATERIAL TYPE */}
              {/* <div>
                <select
                  className="inputStyle"
                  value={jobPaper}
                  onChange={(e) => {
                    setJobPaper(e.target.value);
                    setErrors((prev) => ({ ...prev, jobPaper: "" }));
                  }}
                >
                  <option disabled value="">
                    Select Material Type
                  </option>
                  {materialTypeList.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {errors.jobPaper && (
                  <p className="text-red-600 text-sm">{errors.jobPaper}</p>
                )}
              </div> */}
              <PrimarySelect
                label="Material Type"
                options={materialTypeList}
                value={jobPaper}
                onChange={(e) => setJobPaper(e.target.value)}
              />

              {/* Paper Size */}
              <PrimaryInput
                label="Paper Size"
                type="number"
                placeholder="Paper Size"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
              />
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
                  {/* <input
                    type="number"
                    placeholder="Running Meter"
                    className="border p-3 rounded-xl"
                    value={row.runningMeter}
                    onChange={(e) =>
                      handleRowChange(index, "runningMeter", e.target.value)
                    }
                  /> */}
                  <PrimaryInput
                    type="number"
                    label="Running Meter"
                    placeholder="Running Meter"
                    value={row.runningMeter}
                    onChange={(e) =>
                      handleRowChange(index, "runningMeter", e.target.value)
                    }
                  />

                  {/* <input
                    type="number"
                    placeholder="Roll"
                    className="border p-3 rounded-xl"
                    value={row.roll}
                    onChange={(e) =>
                      handleRowChange(index, "roll", e.target.value)
                    }
                  /> */}
                  <PrimaryInput
                    type="number"
                    label="Roll"
                    placeholder="Roll"
                    value={row.roll}
                    onChange={(e) =>
                      handleRowChange(index, "roll", e.target.value)
                    }
                  />

                  {/* <input
                    type="text"
                    placeholder="Total"
                    className="border p-3 rounded-xl bg-gray-200"
                    value={row.total}
                    readOnly
                  /> */}
                  <PrimaryInput
                    type="number"
                    label="Total"
                    placeholder="Total"
                    value={row.total}
                    readOnly
                    desabled
                    onChange={(e) =>
                      handleRowChange(index, "total", e.target.value)
                    }
                  />

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

              {errors.rows && (
                <p className="text-red-600 text-sm">{errors.rows}</p>
              )}
              {!isEdit && <Addbtn onClick={addRow}>Add Row</Addbtn>}

              <PrimaryBtn className="w-full" type="submit">
                {isEdit ? "Update" : "Submit"}
              </PrimaryBtn>

              {/* {message && (
              <div className="mt-4 text-green-600 font-bold text-lg">
              {message}
              </div>
              )} */}
            </div>
          </form>
        </div>
      </div>
      <SuccessPopup
        show={showPopup}
        onClose={() => setShowPopup(false)}
        message={
          isEdit
            ? "Material updated successfully!"
            : "Material added successfully!"
        }
      />
    </>
  );
};

export default AddMaterial;
