// AddJob.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Link,
  Outlet,
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
} from "../../utils/constant";
import { startTransition } from "react";
import PrimaryBtn from "../../Components/PrimaryBtn";

const db = getFirestore(getApp()); // assumes firebase app already initialized

const PrimaryInput = ({ type, value, onChange, name, placeholder }) => {
  return (
    <input
      type={type}
      value={value}
      name={name}
      placeholder={placeholder}
      onChange={onChange}
      className="inputStyle"
    />
  );
};



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
    <div className="space-y-5">
      <h1>{isEdit ? "Edit Job" : "Add New Job"}</h1>
      <hr className="mb-20" />

    <div className="py-16 mt-10 space-y-10 bg-gray-100 container rounded-2xl">
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8 w-full ">
        {/* PO No */}
        <PrimaryInput
          type={"text"}
          name="poNo"
          placeholder="Phone No"
          value={poNo}
          onChange={(e) => setPoNo(e.target.value)}
        />
        
        {/* Date */}
        <PrimaryInput
          type={"date"}
          name="jobDate"
          placeholder="Job Date"
          value={dateInputValue(jobDate)}
          onChange={(e) => setJobDate(new Date(e.target.value))}
        />

        {/* Job Name */}
        <PrimaryInput
          type={"text"}
          name="jobName"
          placeholder="Job Name"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
        />

        {/* Job Card No */}
        <PrimaryInput
          type={"text"}
          name="jobCardNo"
          placeholder="Job Card No"
          value={jobCardNo}
          onChange={(e) => setJobCardNo(e.target.value)}
        />

        {/* Customer Name */}
        <PrimaryInput
          type={"text"}
          name="customerName"
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        {/* Job Original Size */}
        <PrimaryInput
          type={"text"}
          name="jobSize"
          placeholder="Job Original Size"
          value={jobSize}
          onChange={(e) => setJobSize(e.target.value)}
        />
        
        {/* Job Qty */}
        <PrimaryInput
          type={"number"}
          name="jobQty"
          placeholder="Job Qty"
          value={jobQty}
          onChange={(e) => setJobQty(e.target.value)}
        />

        {/* Job Paper / Film Material */}
        {/* <label className="font-medium">Job Paper / File Material:</label> */}
        <select
          name="jobPaper"
          value={jobPaper}
          onChange={(e) => setJobPaper(e.target.value)}
          className="inputStyle"
        >
          <option disabled value="" className="text-[#848282]">Job Paper/file Material:</option>
          {materialTypeList.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Printing Plate Size */}
        {/* <label className="font-medium">Printing Plate Size:</label> */}
        <select
          name="plateSize"
          value={plateSize}
          onChange={(e) => setPlateSize(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select plate size</option>
          {printingPlateSize.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Across Ups */}
        {/* <label className="font-medium">Across Ups:</label> */}
        <select
          name="upsAcross"
          value={upsAcrossValue}
          onChange={(e) => setUpsAcrossValue(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select ups</option>
          {upsAcross.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Across Gap */}
        <PrimaryInput
          type={"number"}
          name="acrossGap"
          placeholder="Across Gap"
          value={acrossGap}
          onChange={(e) => setAcrossGap(e.target.value)}
        />
        {/* <label className="font-medium">Across Gap:</label> */}
        

        {/* Around */}
        {/* <label className="font-medium">Around:</label> */}
        <select
          name="around"
          value={aroundValue}
          onChange={(e) => setAroundValue(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select around</option>
          {around.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Around Gap */}
        <PrimaryInput
          type={"number"}
          name="aroundGap"
          placeholder="Around Gap"
          value={aroundGap}
          onChange={(e) => setAroundGap(e.target.value)}
        />
        {/* <label className="font-medium">Around Gap:</label> */}
         

        {/* Teeth Size */}
        {/* <label className="font-medium">Teeth Size:</label> */}
        <select
          name="teethSize"
          value={teethSizeValue}
          onChange={(e) => setTeethSizeValue(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select teeth size</option>
          {teethSize.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Blocks */}
        {/* <label className="font-medium">Blocks:</label> */}
        <select
          name="blocks"
          value={blocksValue}
          onChange={(e) => setBlocksValue(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select blocks</option>
          {blocks.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Winding Direction */}
        {/* <label className="font-medium">Winding Direction:</label> */}
        <select
          name="windingDirection"
          value={windingDirectionValue}
          onChange={(e) => setWindingDirectionValue(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select winding direction</option>
          {windingDirection.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {/* Label Type */}
        {/* <label className="font-medium">Label Type:</label> */}
        <select
          name="labelType"
          value={selectedLabelType}
          onChange={(e) => setSelectedLabelType(e.target.value)}
          className="inputStyle"
        >
          <option value="">Select label type</option>
          {labelType.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </form>
      <PrimaryBtn onClick={handleSubmit} className=" w-full mx-auto md:col-span-2">
        Submit
      </PrimaryBtn>

      {message && (
        <div className="mt-4 text-green-600 font-bold text-lg">{message}</div>
      )}
    </div>
    </div>
  );
};

export default AddJob;
