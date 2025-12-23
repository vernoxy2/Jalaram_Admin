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
import BackButton from "../../Components/BackButton";
import SuccessPopup from "../../Components/SuccessPopup";

const db = getFirestore(getApp());

// Floating Label Input Component
const FloatingInput = ({
  type = "text",
  value,
  onChange,
  name,
  label,
  readOnly,
  error,
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
            ? "-top-2.5 text-xs text-gray-600 font-medium bg-white px-1 py-0.5 rounded-sm "
            : "top-1/2 -translate-y-1/2 text-gray-500"
        }`}
      >
        {label}
      </label>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
};

// Floating Label Select Component
const FloatingSelect = ({
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

const AddJob = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "true" || !!id;

  const [showPopup, setShowPopup] = useState(false);

  const [poNo, setPoNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobCardNo, setJobCardNo] = useState("");
  const [jobName, setJobName] = useState("");
  const [jobDate, setJobDate] = useState(() => new Date());
  const [jobLength, setJobLength] = useState("");
  const [jobWidth, setJobWidth] = useState("");
  const [paperSize, setPaperSize] = useState("");
  const [totalPaperRequired, setTotalPaperRequired] = useState("");
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
  const [errors, setErrors] = useState({});
  const [calculationSize, setCalculationSize] = useState("");

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
        setJobLength(data.jobLength || "");
        setJobWidth(data.jobWidth || "");
        setPaperSize(data.paperSize || "");
        setTotalPaperRequired(data.totalPaperRequired || "");
        setJobQty(data.jobQty || "");
        setAcrossGap(data.acrossGap || "");
        setAroundGap(data.aroundGap || "");
        setAccept(data.accept || false);
        setCalculationSize(data.calculationSize || "");

        setJobPaper(data.jobPaper?.value || "");
        setPlateSize(data.printingPlateSize?.value || "");
        setUpsAcrossValue(data.upsAcross?.value || "");
        setAroundValue(data.around?.value || "");
        setTeethSizeValue(data.teethSize?.value || "");
        setBlocksValue(data.blocks?.value || "");
        setWindingDirectionValue(data.windingDirection?.value || "");
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
      const prefix = `${monthPrefix}.${yearSuffix}`;

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

  const calculateTotalPaper = useCallback((qty, size, ups, gap) => {
    const totalLabels = parseFloat(qty);
    const labelSize = parseFloat(size);
    const across = parseFloat(ups);
    const aroundGapValue = parseFloat(gap);

    if (
      !isNaN(totalLabels) &&
      !isNaN(labelSize) &&
      !isNaN(across) &&
      !isNaN(aroundGapValue)
    ) {
      const total =
        ((labelSize + aroundGapValue) * totalLabels) / (1000 * across);
      setTotalPaperRequired(total.toFixed(2));
    }
  }, []);

  const handleJobQtyChange = (e) => {
    const value = e.target.value;
    setJobQty(value);
    calculateTotalPaper(value, calculationSize, upsAcrossValue, aroundGap);
  };

  const handleCalculationSizeChange = (e) => {
    const value = e.target.value;
    setCalculationSize(value);
    calculateTotalPaper(jobQty, value, upsAcrossValue, aroundGap);
  };

  const handleUpsAcrossChange = (e) => {
    const value = e.target.value;
    setUpsAcrossValue(value);
    calculateTotalPaper(jobQty, calculationSize, value, aroundGap);
  };

  const handleAroundGapChange = (e) => {
    const value = e.target.value;
    setAroundGap(value);
    calculateTotalPaper(jobQty, calculationSize, upsAcrossValue, value);
  };

  const findOption = (list, value) => {
    return list.find((i) => i.value === value) || { label: "", value: "" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("Please fill all required fields");
      return;
    }

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
        jobLength,
        jobWidth,
        paperSize,
        jobQty,
        calculationSize,
        totalPaperRequired,
        jobType: selectedLabelType,
        assignedTo: assignedUserUID,
        jobPaper: findOption(materialTypeList, jobPaper),
        printingPlateSize: findOption(printingPlateSize, plateSize),
        upsAcross: findOption(upsAcross, upsAcrossValue),
        around: findOption(around, aroundValue),
        teethSize: findOption(teethSize, teethSizeValue),
        blocks: findOption(blocks, blocksValue),
        windingDirection: findOption(windingDirection, windingDirectionValue),
        accept,
        acrossGap,
        aroundGap,
        materialAllotStatus: "Pending",
        materialAllocations: [],
        updatedAt: serverTimestamp(),
      };

      const materialRequestData = {
        jobCardNo,
        jobName,
        jobLength,
        jobWidth,
        paperSize,
        jobPaper: findOption(materialTypeList, jobPaper),
        jobQty,
        calculationSize,
        totalPaperRequired,
        requiredMaterial: totalPaperRequired,
        requestStatus: "Pending",
        requestType: "Initial",
        createdAt: serverTimestamp(),
        createdBy: "Admin",
        customerName,
      };

      if (isEdit && id) {
        const docRef = doc(db, "ordersTest", id);
        await updateDoc(docRef, orderData);

        const q = query(
          collection(db, "materialRequest"),
          where("jobCardNo", "==", jobCardNo),
          where("requestType", "==", "Initial")
        );
        const materialRequestSnapshot = await getDocs(q);

        if (!materialRequestSnapshot.empty) {
          const materialDocId = materialRequestSnapshot.docs[0].id;
          await updateDoc(doc(db, "materialRequest", materialDocId), {
            ...materialRequestData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, "materialRequest"), materialRequestData);
        }

        setShowPopup(true);
      } else {
        const q = query(
          collection(db, "ordersTest"),
          where("jobCardNo", "==", jobCardNo)
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
          alert("Duplicate Job Card No. Please regenerate.");
          return;
        }

        const orderRef = await addDoc(collection(db, "ordersTest"), {
          ...orderData,
          jobStatus,
          createdAt: serverTimestamp(),
          createdBy: "Admin",
        });

        await addDoc(collection(db, "materialRequest"), {
          ...materialRequestData,
          orderId: orderRef.id,
        });

        setShowPopup(true);
      }

      setTimeout(() => navigate(-1), 1200);
    } catch (error) {
      console.error("Submit Error:", error);
      alert("Something went wrong. Check console.");
    }
  };

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

  const validateForm = () => {
    const newErrors = {};

    if (!poNo.trim()) newErrors.poNo = "PO No is required";
    if (!jobName.trim()) newErrors.jobName = "Job Name is required";
    if (!jobCardNo.trim()) newErrors.jobCardNo = "Job Card No is required";
    if (!customerName.trim())
      newErrors.customerName = "Customer Name is required";
    if (!jobLength) newErrors.jobLength = "Job Length is required";
    if (!jobWidth) newErrors.jobWidth = "Job Width is required";
    if (!paperSize) newErrors.paperSize = "Paper Size is required";
    if (!jobQty) newErrors.jobQty = "Job Quantity is required";
    if (!calculationSize) newErrors.calculationSize = "Label size is required";
    if (!upsAcrossValue) newErrors.upsAcrossValue = "Across Ups is required";
    if (!aroundGap) newErrors.aroundGap = "Around Gap is required";
    if (!totalPaperRequired)
      newErrors.totalPaperRequired = "Total Paper Required is required";
    if (!selectedLabelType)
      newErrors.selectedLabelType = "Label Type is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex justify-between items-baseline">
          <h1>{isEdit ? "Edit Job" : "Add New Job"}</h1>
          <BackButton />
        </div>
        <hr className="mb-20" />

        <div className="py-16 mt-10 space-y-10 bg-gray-100 container rounded-2xl">
          <form
            onSubmit={handleSubmit}
            className="grid md:grid-cols-2 gap-8 w-full"
          >
            {/* PO No */}
            <FloatingInput
              type="text"
              name="poNo"
              label="PO No *"
              value={poNo}
              onChange={(e) => {
                setPoNo(e.target.value);
                setErrors((prev) => ({ ...prev, poNo: "" }));
              }}
              error={errors.poNo}
            />

            {/* Date */}
            <FloatingInput
              type="date"
              name="jobDate"
              label="Job Date"
              value={dateInputValue(jobDate)}
              onChange={(e) => setJobDate(new Date(e.target.value))}
            />

            {/* Job Name */}
            <FloatingInput
              type="text"
              name="jobName"
              label="Job Name *"
              value={jobName}
              onChange={(e) => {
                setJobName(e.target.value);
                setErrors((prev) => ({ ...prev, jobName: "" }));
              }}
              error={errors.jobName}
            />

            {/* Job Card No */}
            <FloatingInput
              type="text"
              name="jobCardNo"
              label="Job Card No *"
              value={jobCardNo}
              onChange={(e) => {
                setJobCardNo(e.target.value);
                setErrors((prev) => ({ ...prev, jobCardNo: "" }));
              }}
              error={errors.jobCardNo}
            />

            {/* Customer Name */}
            <FloatingInput
              type="text"
              name="customerName"
              label="Customer Name *"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setErrors((prev) => ({ ...prev, customerName: "" }));
              }}
              error={errors.customerName}
            />

            {/* Job Length */}
            <FloatingInput
              type="number"
              name="jobLength"
              label="Job Length *"
              value={jobLength}
              onChange={(e) => {
                setJobLength(e.target.value);
                setErrors((prev) => ({ ...prev, jobLength: "" }));
              }}
              error={errors.jobLength}
            />

            {/* Job Width */}
            <FloatingInput
              type="number"
              name="jobWidth"
              label="Job Width *"
              value={jobWidth}
              onChange={(e) => {
                setJobWidth(e.target.value);
                setErrors((prev) => ({ ...prev, jobWidth: "" }));
              }}
              error={errors.jobWidth}
            />

            {/* Paper Size */}
            <FloatingInput
              type="number"
              name="paperSize"
              label="Paper Size *"
              value={paperSize}
              onChange={(e) => {
                setPaperSize(e.target.value);
                setErrors((prev) => ({ ...prev, paperSize: "" }));
              }}
              error={errors.paperSize}
            />

            {/* Job Qty */}
            <FloatingInput
              type="number"
              name="jobQty"
              label="Job Qty *"
              value={jobQty}
              onChange={(e) => {
                handleJobQtyChange(e);
                setErrors((prev) => ({ ...prev, jobQty: "" }));
              }}
              error={errors.jobQty}
            />

            {/* Job Paper / Film Material */}
            <FloatingSelect
              name="jobPaper"
              label="Job Paper/Film Material"
              value={jobPaper}
              onChange={(e) => setJobPaper(e.target.value)}
              options={materialTypeList}
            />

            {/* Printing Plate Size */}
            <FloatingSelect
              name="plateSize"
              label="Printing Plate Size"
              value={plateSize}
              onChange={(e) => setPlateSize(e.target.value)}
              options={printingPlateSize}
            />

            {/* Label Size (for calculation) */}
            <FloatingInput
              type="number"
              name="calculationSize"
              label="Label Size (for calculation) *"
              value={calculationSize}
              onChange={(e) => {
                handleCalculationSizeChange(e);
                setErrors((prev) => ({ ...prev, calculationSize: "" }));
              }}
              error={errors.calculationSize}
            />

            {/* Across Ups */}
            <FloatingSelect
              name="upsAcross"
              label="Across Ups"
              value={upsAcrossValue}
              onChange={(e) => {
                handleUpsAcrossChange(e);
                setErrors((prev) => ({ ...prev, upsAcrossValue: "" }));
              }}
              options={upsAcross}
              error={errors.upsAcrossValue}
              required
            />

            {/* Across Gap */}
            <FloatingInput
              type="number"
              name="acrossGap"
              label="Across Gap"
              value={acrossGap}
              onChange={(e) => setAcrossGap(e.target.value)}
            />

            {/* Around */}
            <FloatingSelect
              name="around"
              label="Around"
              value={aroundValue}
              onChange={(e) => setAroundValue(e.target.value)}
              options={around}
            />

            {/* Around Gap */}
            <FloatingInput
              type="number"
              name="aroundGap"
              label="Around Gap *"
              value={aroundGap}
              onChange={(e) => {
                handleAroundGapChange(e);
                setErrors((prev) => ({ ...prev, aroundGap: "" }));
              }}
              error={errors.aroundGap}
            />

            {/* Total Paper Required */}
            <FloatingInput
              type="text"
              name="totalPaperRequired"
              label="Total Paper Required"
              value={totalPaperRequired}
              onChange={(e) => {
                setTotalPaperRequired(e.target.value);
                setErrors((prev) => ({ ...prev, totalPaperRequired: "" }));
              }}
              readOnly={true}
              error={errors.totalPaperRequired}
            />

            {/* Teeth Size */}
            <FloatingSelect
              name="teethSize"
              label="Teeth Size"
              value={teethSizeValue}
              onChange={(e) => setTeethSizeValue(e.target.value)}
              options={teethSize}
            />

            {/* Blocks */}
            <FloatingSelect
              name="blocks"
              label="Blocks"
              value={blocksValue}
              onChange={(e) => setBlocksValue(e.target.value)}
              options={blocks}
            />

            {/* Winding Direction */}
            <FloatingSelect
              name="windingDirection"
              label="Winding Direction"
              value={windingDirectionValue}
              onChange={(e) => setWindingDirectionValue(e.target.value)}
              options={windingDirection}
            />

            {/* Label Type */}
            <FloatingSelect
              name="labelType"
              label="Label Type"
              value={selectedLabelType}
              onChange={(e) => {
                setSelectedLabelType(e.target.value);
                setErrors((prev) => ({ ...prev, selectedLabelType: "" }));
              }}
              options={labelType}
              error={errors.selectedLabelType}
              required
            />
          </form>

          <PrimaryBtn
            onClick={handleSubmit}
            className="w-full mx-auto md:col-span-2"
          >
            Submit
          </PrimaryBtn>
        </div>
      </div>

      {showPopup && (
        <SuccessPopup
          message={
            isEdit ? "Job updated successfully!" : "Job added successfully!"
          }
          show={showPopup}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  );
};

export default AddJob;
