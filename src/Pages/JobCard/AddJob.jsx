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
import PrimaryBackBtn from "../../Components/BackButton";
import { FaChevronLeft } from "react-icons/fa6";
import BackButton from "../../Components/BackButton";
import SuccessPopup from "../../Components/SuccessPopup";

const db = getFirestore(getApp()); // assumes firebase app already initialized

const PrimaryInput = ({
  type,
  value,
  onChange,
  name,
  placeholder,
  readOnly,
}) => {
  return (
    <input
      type={type}
      value={value}
      name={name}
      placeholder={placeholder}
      onChange={onChange}
      className="inputStyle"
      readOnly={readOnly}
    />
  );
};

const AddJob = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // optional route param /add-job/:id
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "true" || !!id;

  // message for success/error
  // const [message, setMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  // Mirror RN state names
  const [poNo, setPoNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [jobCardNo, setJobCardNo] = useState("");
  const [jobName, setJobName] = useState("");
  const [jobDate, setJobDate] = useState(() => new Date());
  // const [jobSize, setJobSize] = useState("");
  const [jobLength, setJobLength] = useState("");
  const [jobWidth, setJobWidth] = useState("");
  const [paperSize, setPaperSize] = useState(""); // ✅ NEW FIELD
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
        // setJobSize(data.jobSize || "");
        setJobLength(data.jobLength || "");
        setJobWidth(data.jobWidth || "");
        setPaperSize(data.paperSize || ""); // ✅ NEW FIELD
        setTotalPaperRequired(data.totalPaperRequired || "");
        setJobQty(data.jobQty || "");
        setAcrossGap(data.acrossGap || "");
        setAroundGap(data.aroundGap || "");
        setAccept(data.accept || false);
        setCalculationSize(data.calculationSize || "");

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

  // ✅ UPDATED FORMULA: totalPaperRequired = ((labelSize + aroundGap)*totalLabels)/(1000*across)
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

  // ✅ NEW HANDLER for aroundGap
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
        // jobSize,
        jobLength,
        jobWidth,
        paperSize, // ✅ NEW FIELD
        jobQty,
        calculationSize,
        totalPaperRequired,
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
        materialAllotStatus: "Pending",
        materialAllocations: [],
        updatedAt: serverTimestamp(),
      };

      // ✅ Material Request Data
      const materialRequestData = {
        jobCardNo,
        jobName,
        jobLength,
        jobWidth,
        paperSize, // ✅ NEW FIELD
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
        // Update existing order
        const docRef = doc(db, "ordersTest", id);
        await updateDoc(docRef, orderData);

        // ✅ Update or create material request
        const q = query(
          collection(db, "materialRequest"),
          where("jobCardNo", "==", jobCardNo),
          where("requestType", "==", "Initial")
        );
        const materialRequestSnapshot = await getDocs(q);

        if (!materialRequestSnapshot.empty) {
          // Update existing material request
          const materialDocId = materialRequestSnapshot.docs[0].id;
          await updateDoc(doc(db, "materialRequest", materialDocId), {
            ...materialRequestData,
            updatedAt: serverTimestamp(),
          });
        } else {
          // Create new material request
          await addDoc(collection(db, "materialRequest"), materialRequestData);
        }

        setShowPopup(true);
      } else {
        // Check duplicate jobCardNo
        const q = query(
          collection(db, "ordersTest"),
          where("jobCardNo", "==", jobCardNo)
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
          alert("Duplicate Job Card No. Please regenerate.");
          return;
        }

        // ✅ Create new order and get reference
        const orderRef = await addDoc(collection(db, "ordersTest"), {
          ...orderData,
          jobStatus,
          createdAt: serverTimestamp(),
          createdBy: "Admin",
        });

        // ✅ Add material request with orderId
        await addDoc(collection(db, "materialRequest"), {
          ...materialRequestData,
          orderId: orderRef.id,
        });

        setShowPopup(true);
      }

      // navigate back a bit after a short feedback
      setTimeout(() => navigate(-1), 1200);
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

  /* ---------------------------------------------------
   VALIDATE FORM
--------------------------------------------------- */
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!poNo.trim()) newErrors.poNo = "PO No is required";
    if (!jobName.trim()) newErrors.jobName = "Job Name is required";
    if (!jobCardNo.trim()) newErrors.jobCardNo = "Job Card No is required";
    if (!customerName.trim())
      newErrors.customerName = "Customer Name is required";

    if (!jobLength) newErrors.jobLength = "Job Length is required";
    if (!jobWidth) newErrors.jobWidth = "Job Width is required";
    if (!paperSize) newErrors.paperSize = "Paper Size is required"; // ✅ NEW VALIDATION
    if (!jobQty) newErrors.jobQty = "Job Quantity is required";
    if (!calculationSize) newErrors.calculationSize = "Label size is required";
    if (!upsAcrossValue) newErrors.upsAcrossValue = "Across Ups is required";
    if (!aroundGap) newErrors.aroundGap = "Around Gap is required"; // ✅ NEW VALIDATION
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
            className="grid md:grid-cols-2 gap-8 w-full "
          >
            {/* PO No */}
            <div>
              <PrimaryInput
                type="text"
                name="poNo"
                placeholder="PO No"
                value={poNo}
                onChange={(e) => {
                  setPoNo(e.target.value);
                  setErrors((prev) => ({ ...prev, poNo: "" }));
                }}
              />
              {errors.poNo && (
                <p className="text-red-600 text-sm">{errors.poNo}</p>
              )}
            </div>

            {/* Date */}
            <PrimaryInput
              type={"date"}
              name="jobDate"
              placeholder="Job Date"
              value={dateInputValue(jobDate)}
              onChange={(e) => setJobDate(new Date(e.target.value))}
            />

            {/* Job Name */}
            <div>
              <PrimaryInput
                type="text"
                name="jobName"
                placeholder="Job Name"
                value={jobName}
                onChange={(e) => {
                  setJobName(e.target.value);
                  setErrors((prev) => ({ ...prev, jobName: "" }));
                }}
              />
              {errors.jobName && (
                <p className="text-red-600 text-sm">{errors.jobName}</p>
              )}
            </div>

            {/* Job Card No */}
            <div>
              <PrimaryInput
                type={"text"}
                name="jobCardNo"
                placeholder="Job Card No"
                value={jobCardNo}
                onChange={(e) => {
                  setJobCardNo(e.target.value);
                  setErrors((prev) => ({ ...prev, jobCardNo: "" }));
                }}
              />
              {errors.jobCardNo && (
                <p className="text-red-600 text-sm">{errors.jobCardNo}</p>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <PrimaryInput
                type={"text"}
                name="customerName"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setErrors((prev) => ({ ...prev, customerName: "" }));
                }}
              />
              {errors.customerName && (
                <p className="text-red-600 text-sm">{errors.customerName}</p>
              )}
            </div>

            {/* Job Length */}
            <div>
              <PrimaryInput
                type={"number"}
                name="jobLength"
                placeholder="Job Length"
                value={jobLength}
                onChange={(e) => {
                  setJobLength(e.target.value);
                  setErrors((prev) => ({ ...prev, jobLength: "" }));
                }}
              />
              {errors.jobLength && (
                <p className="text-red-600 text-sm">{errors.jobLength}</p>
              )}
            </div>

            {/* Job Width */}
            <div>
              <PrimaryInput
                type={"number"}
                name="jobWidth"
                placeholder="Job Width"
                value={jobWidth}
                onChange={(e) => {
                  setJobWidth(e.target.value);
                  setErrors((prev) => ({ ...prev, jobWidth: "" }));
                }}
              />
              {errors.jobWidth && (
                <p className="text-red-600 text-sm">{errors.jobWidth}</p>
              )}
            </div>

            {/* ✅ Paper Size - NEW FIELD */}
            <div>
              <PrimaryInput
                type={"number"}
                name="paperSize"
                placeholder="Paper Size *"
                value={paperSize}
                onChange={(e) => {
                  setPaperSize(e.target.value);
                  setErrors((prev) => ({ ...prev, paperSize: "" }));
                }}
              />
              {errors.paperSize && (
                <p className="text-red-600 text-sm">{errors.paperSize}</p>
              )}
            </div>

            {/* Job Qty */}
            <div>
              <PrimaryInput
                type={"number"}
                name="jobQty"
                placeholder="Job Qty"
                value={jobQty}
                onChange={(e) => {
                  handleJobQtyChange(e);
                  setErrors((prev) => ({ ...prev, jobQty: "" }));
                }}
              />
              {errors.jobQty && (
                <p className="text-red-600 text-sm">{errors.jobQty}</p>
              )}
            </div>

            {/* Job Paper / Film Material */}
            <select
              name="jobPaper"
              value={jobPaper}
              onChange={(e) => setJobPaper(e.target.value)}
              className="inputStyle"
            >
              <option disabled value="" className="text-[#848282]">
                Job Paper/Film Material:
              </option>
              {materialTypeList.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Printing Plate Size */}
            <select
              name="plateSize"
              value={plateSize}
              onChange={(e) => setPlateSize(e.target.value)}
              className="inputStyle"
            >
              <option value="">Select Printing Plate Size</option>
              {printingPlateSize.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Label Size (for calculation) */}
            <div>
              <PrimaryInput
                type="number"
                name="calculationSize"
                placeholder="Label Size (for calculation)"
                value={calculationSize}
                onChange={(e) => {
                  handleCalculationSizeChange(e);
                  setErrors((prev) => ({ ...prev, calculationSize: "" }));
                }}
              />
              {errors.calculationSize && (
                <p className="text-red-600 text-sm">{errors.calculationSize}</p>
              )}
            </div>

            {/* Across Ups */}
            <div>
              <select
                name="upsAcross"
                value={upsAcrossValue}
                onChange={(e) => {
                  handleUpsAcrossChange(e);
                  setErrors((prev) => ({ ...prev, upsAcrossValue: "" }));
                }}
                className="inputStyle"
              >
                <option value="">Select Across Ups *</option>
                {upsAcross.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errors.upsAcrossValue && (
                <p className="text-red-600 text-sm">{errors.upsAcrossValue}</p>
              )}
            </div>

            {/* Across Gap */}
            <PrimaryInput
              type={"number"}
              name="acrossGap"
              placeholder="Across Gap"
              value={acrossGap}
              onChange={(e) => setAcrossGap(e.target.value)}
            />

            {/* Around */}
            <select
              name="around"
              value={aroundValue}
              onChange={(e) => setAroundValue(e.target.value)}
              className="inputStyle"
            >
              <option value="">Select Around</option>
              {around.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* ✅ Around Gap - REQUIRED FIELD, placed BEFORE totalPaperRequired */}
            <div>
              <PrimaryInput
                type={"number"}
                name="aroundGap"
                placeholder="Around Gap *"
                value={aroundGap}
                onChange={(e) => {
                  handleAroundGapChange(e);
                  setErrors((prev) => ({ ...prev, aroundGap: "" }));
                }}
              />
              {errors.aroundGap && (
                <p className="text-red-600 text-sm">{errors.aroundGap}</p>
              )}
            </div>

            {/* Total Paper Required - can be manually edited */}
            <div>
              <PrimaryInput
                type={"text"}
                name="totalPaperRequired"
                placeholder="Total Paper Required"
                value={totalPaperRequired}
                onChange={(e) => {
                  setTotalPaperRequired(e.target.value);
                  setErrors((prev) => ({ ...prev, totalPaperRequired: "" }));
                }}
                readOnly={true}
              />
              {errors.totalPaperRequired && (
                <p className="text-red-600 text-sm">
                  {errors.totalPaperRequired}
                </p>
              )}
            </div>

            {/* Teeth Size */}
            <select
              name="teethSize"
              value={teethSizeValue}
              onChange={(e) => setTeethSizeValue(e.target.value)}
              className="inputStyle"
            >
              <option value="">Select Teeth Size</option>
              {teethSize.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Blocks */}
            <select
              name="blocks"
              value={blocksValue}
              onChange={(e) => setBlocksValue(e.target.value)}
              className="inputStyle"
            >
              <option value="">Select Blocks</option>
              {blocks.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Winding Direction */}
            <select
              name="windingDirection"
              value={windingDirectionValue}
              onChange={(e) => setWindingDirectionValue(e.target.value)}
              className="inputStyle"
            >
              <option value="">Select Winding Direction</option>
              {windingDirection.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Label Type */}
            <div>
              <select
                name="labelType"
                value={selectedLabelType}
                onChange={(e) => {
                  setSelectedLabelType(e.target.value);
                  setErrors((prev) => ({ ...prev, selectedLabelType: "" }));
                }}
                className="inputStyle"
              >
                <option value="">Select Label type</option>
                {labelType.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {errors.selectedLabelType && (
                <p className="text-red-600 text-sm">
                  {errors.selectedLabelType}
                </p>
              )}
            </div>
          </form>

          <PrimaryBtn
            onClick={handleSubmit}
            className=" w-full mx-auto md:col-span-2"
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
