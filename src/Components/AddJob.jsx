// AddJob.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import moment from "moment";
// Firestore modular imports - adjust if your project uses a different wrapper
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import {
  around,
  blocks,
  labelType,
  materialTypeList,
  printingPlateSize,
  teethSize,
  upsAcross,
  windingDirection,
} from "../utils/constant";
import { startTransition } from "react";

const db = getFirestore(getApp()); // assumes firebase app already initialized

const AddJob = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // optional route param /add-job/:id
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "true" || !!id;

  // message for success/error
  const [message, setMessage] = useState("");

  // Mirror RN state names
  const [poNo, setPoNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobCardNo, setJobCardNo] = useState("");
  const [jobName, setJobName] = useState("");
  const [jobDate, setJobDate] = useState(() => new Date());
  const [jobSize, setJobSize] = useState("");
  const [jobQty, setJobQty] = useState("");
  const [jobPaper, setJobPaper] = useState("");
  const [plateSize, setPlateSize] = useState("");
  const [upsAcrossValue, setUpsAcrossValue] = useState("");
  const [aroundValue, setAroundValue] = useState("");
  const [teethSizeValue, setTeethSizeValue] = useState("");
  const [blocksValue, setBlocksValue] = useState("");
  const [windingDirectionValue, setWindingDirectionValue] = useState("");
  const [selectedLabelType, setSelectedLabelType] = useState("");
  const [accept, setAccept] = useState(false);
  const [acrossGap, setAcrossGap] = useState("");
  const [aroundGap, setAroundGap] = useState("");
  const fetchOrderDetails = useCallback(async (docId) => {
    try {
      const snap = await getDoc(doc(db, "ordersTest", docId));
      if (!snap.exists()) return;
      const data = snap.data();

      startTransition(() => {
        setPoNo(data.poNo || "");
        setCustomerName(data.customerName || "");
        setJobCardNo(data.jobCardNo || "");
        setJobName(data.jobName || "");
        setJobDate(data.jobDate ? data.jobDate.toDate() : new Date());
        setJobSize(data.jobSize || "");
        setJobQty(data.jobQty || "");
        setAcrossGap(data.acrossGap || "");
        setAroundGap(data.aroundGap || "");
        setAccept(data.accept || false);

        // ⭐ FIX: extract `.value` from objects
        setJobPaper(data.jobPaper?.value || "");
        setPlateSize(data.printingPlateSize?.value || "");
        setUpsAcrossValue(data.upsAcross?.value || "");
        setAroundValue(data.around?.value || "");
        setTeethSizeValue(data.teethSize?.value || "");
        setBlocksValue(data.blocks?.value || "");
        setWindingDirectionValue(data.windingDirection?.value || "");

        // Label Type (simple string)
        setSelectedLabelType(data.jobType || "");
      });
    } catch (err) {
      console.error("Error fetching order details:", err);
    }
  }, []);

  const generateJobCardNo = useCallback(async () => {
    try {
      const monthPrefix = moment().format("MMM");
      const yearSuffix = moment().format("YY");
      const prefix = `${monthPrefix}.${yearSuffix}`; // e.g. Nov.25

      // Query ordersTest where jobCardNo starts with prefix
      const q = query(
        collection(db, "ordersTest"),
        where("jobCardNo", ">=", `${prefix}-`),
        where("jobCardNo", "<=", `${prefix}-\uf8ff`)
      );
      const snap = await getDocs(q);

      let maxNumber = 0;
      snap.forEach((d) => {
        const jc = d.data().jobCardNo;
        if (jc && jc.startsWith(prefix)) {
          const parts = jc.split("-");
          if (parts.length === 2 && !isNaN(parts[1])) {
            const n = parseInt(parts[1], 10);
            if (n > maxNumber) maxNumber = n;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      const newJobNo = `${prefix}-${String(nextNumber).padStart(2, "0")}`;
      startTransition(() => {
        setJobCardNo(newJobNo);
      });
    } catch (err) {
      console.error("Error generating job card:", err);
    }
  }, []);
  useEffect(() => {
    console.log(isEdit);
    console.log(id);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (isEdit && id) {
        await fetchOrderDetails(id);
      } else {
        startTransition(() => {
          generateJobCardNo();
        });
      }
    };

    run();
  }, [isEdit, id]);

  const findOption = (list, value) => {
    return list.find((i) => i.value === value) || { label: "", value: "" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const normalizedLabelType = (selectedLabelType || "")
        .trim()
        .toLowerCase();
      let assignedUserUID;
      let jobStatus;

      if (normalizedLabelType === "printing") {
        assignedUserUID = "uqTgURHeSvONdbFs154NfPYND1f2";
        jobStatus = "Printing";
      } else if (normalizedLabelType === "plain") {
        assignedUserUID = "Kt1bJQzaUPdAowP7bTpdNQEfXKO2";
        jobStatus = "Punching";
      } else {
        alert("Please select a valid Label Type (printing/plain)");
        return;
      }
      const orderData = {
        poNo,
        jobDate: Timestamp.fromDate(new Date(jobDate)),
        customerName,
        jobCardNo,
        jobName,
        jobSize,
        jobQty,
        jobType: selectedLabelType,
        assignedTo: assignedUserUID,

        // 🔥 Convert SELECT VALUE → { label, value }
        jobPaper: findOption(materialTypeList, jobPaper),
        printingPlateSize: findOption(printingPlateSize, plateSize),
        upsAcross: findOption(upsAcross, upsAcrossValue),
        around: findOption(around, aroundValue),
        teethSize: findOption(teethSize, teethSizeValue),
        blocks: findOption(blocks, blocksValue),
        windingDirection: findOption(windingDirection, windingDirectionValue),

        // printingColors,
        accept,
        acrossGap,
        aroundGap,
        updatedAt: serverTimestamp(),
      };

      if (isEdit && id) {
        // update existing doc (keep jobStatus if you want — here we don't overwrite)
        const docRef = doc(db, "ordersTest", id);
        await updateDoc(docRef, orderData);
        setMessage("Job updated successfully");
      } else {
        // check duplicate jobCardNo
        const q = query(
          collection(db, "ordersTest"),
          where("jobCardNo", "==", jobCardNo)
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
          alert("Duplicate Job Card No. Please regenerate.");
          return;
        }

        await addDoc(collection(db, "ordersTest"), {
          ...orderData,
          jobStatus,
          createdAt: serverTimestamp(),
          createdBy: "Admin",
        });
        setMessage("Job created successfully");
      }

      // navigate back a bit after a short feedback
      setTimeout(() => navigate("/jobcard"), 900);
    } catch (error) {
      console.error("Submit Error:", error);
      alert("Something went wrong. Check console.");
    }
  };

  // helper for controlled date input: HTML date value "YYYY-MM-DD"
  const dateInputValue = (d) => {
    try {
      const jsDate = new Date(d);
      const tzOffset = jsDate.getTimezoneOffset() * 60000;
      const localISO = new Date(jsDate - tzOffset).toISOString().slice(0, 10);
      return localISO;
    } catch {
      return "";
    }
  };

  return (
    <div className="py-10 flex flex-col gap-3 justify-center items-center bg-gray-100">
      <h1 className="text-2xl">{isEdit ? "Edit Job" : "Add New Job"}</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 w-full max-w-md"
      >
        {/* PO No */}
        <label className="font-medium">PO No:</label>
        <input
          type="text"
          name="poNo"
          value={poNo}
          onChange={(e) => setPoNo(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Date */}
        <label className="font-medium">Job Date:</label>
        <input
          type="date"
          name="jobDate"
          value={dateInputValue(jobDate)}
          onChange={(e) => setJobDate(new Date(e.target.value))}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Job Name */}
        <label className="font-medium">Job Name:</label>
        <input
          type="text"
          name="jobName"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Job Card No */}
        <label className="font-medium">Job Card No:</label>
        <input
          type="text"
          name="jobCardNo"
          value={jobCardNo}
          onChange={(e) => setJobCardNo(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3 bg-gray-50"
          readOnly={isEdit ? false : true} // allow changing if editing, but auto-generated on create
        />

        {/* Customer Name */}
        <label className="font-medium">Customer Name:</label>
        <input
          type="text"
          name="customerName"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Job Original Size */}
        <label className="font-medium">Job Original Size:</label>
        <input
          type="text"
          name="jobSize"
          value={jobSize}
          onChange={(e) => setJobSize(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Job Qty */}
        <label className="font-medium">Job Qty:</label>
        <input
          type="number"
          name="jobQty"
          value={jobQty}
          onChange={(e) => setJobQty(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Job Paper / Film Material */}
        <label className="font-medium">Job Paper / File Material:</label>
        <select
          name="jobPaper"
          value={jobPaper}
          onChange={(e) => setJobPaper(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select material</option>
          {materialTypeList.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Printing Plate Size */}
        <label className="font-medium">Printing Plate Size:</label>
        <select
          name="plateSize"
          value={plateSize}
          onChange={(e) => setPlateSize(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select plate size</option>
          {printingPlateSize.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Across Ups */}
        <label className="font-medium">Across Ups:</label>
        <select
          name="upsAcross"
          value={upsAcrossValue}
          onChange={(e) => setUpsAcrossValue(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select ups</option>
          {upsAcross.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Across Gap */}
        <label className="font-medium">Across Gap:</label>
        <input
          type="number"
          name="acrossGap"
          value={acrossGap}
          onChange={(e) => setAcrossGap(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Around */}
        <label className="font-medium">Around:</label>
        <select
          name="around"
          value={aroundValue}
          onChange={(e) => setAroundValue(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select around</option>
          {around.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Around Gap */}
        <label className="font-medium">Around Gap:</label>
        <input
          type="number"
          name="aroundGap"
          value={aroundGap}
          onChange={(e) => setAroundGap(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        />

        {/* Teeth Size */}
        <label className="font-medium">Teeth Size:</label>
        <select
          name="teethSize"
          value={teethSizeValue}
          onChange={(e) => setTeethSizeValue(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select teeth size</option>
          {teethSize.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Blocks */}
        <label className="font-medium">Blocks:</label>
        <select
          name="blocks"
          value={blocksValue}
          onChange={(e) => setBlocksValue(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select blocks</option>
          {blocks.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Winding Direction */}
        <label className="font-medium">Winding Direction:</label>
        <select
          name="windingDirection"
          value={windingDirectionValue}
          onChange={(e) => setWindingDirectionValue(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select winding direction</option>
          {windingDirection.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Label Type */}
        <label className="font-medium">Label Type:</label>
        <select
          name="labelType"
          value={selectedLabelType}
          onChange={(e) => setSelectedLabelType(e.target.value)}
          className="border border-black/20 rounded-2xl w-full p-3"
        >
          <option value="">Select label type</option>
          {labelType.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-[#3668B1] text-white py-3 px-6 rounded-md font-bold mt-4"
        >
          {isEdit ? "Update" : "Submit"}
        </button>

        <Link
          to="/jobcard"
          className="bg-[#EFEDED] text-black border hover:border-black duration-200 py-3 px-6 rounded-md text-center mt-2"
        >
          Back
        </Link>
      </form>

      {message && (
        <div className="mt-4 text-green-600 font-bold text-lg">{message}</div>
      )}
    </div>
  );
};

export default AddJob;
