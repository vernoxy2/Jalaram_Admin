import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { useParams, useNavigate } from "react-router-dom";
import PrimaryBtn from "../../Components/PrimaryBtn";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FaCaretRight } from "react-icons/fa6";
import { FiSearch } from "react-icons/fi";
import { materialTypeList, paperProductCodeData } from "../../utils/constant";
import BackButton from "../../Components/BackButton";
import SuccessPopup from "../../Components/SuccessPopup";

const MaterialIssueForm = () => {
  const navigate = useNavigate();

  const [selectedRolls, setSelectedRolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [formData, setFormData] = useState({
    jobCardNo: "",
    jobName: "",
    paperSize: "",
    requestedMaterial: "",
    requestDate: "",
    alloteDate: "",
    customerName: "",
  });

  const [jobPaper, setJobPaper] = useState("");
  const [paperProductCode, setPaperProductCode] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const [LO, setLO] = useState([]);
  const [WIP, setWIP] = useState([]);
  const [RAW, setRAW] = useState([]);

  // Search states for each table
  const [searchLO, setSearchLO] = useState("");
  const [searchWIP, setSearchWIP] = useState("");
  const [searchRAW, setSearchRAW] = useState("");

  const { id } = useParams();

  /* -------------------------------------------------------------
     1) FETCH REQUEST DATA BY ID (DYNAMIC)
  --------------------------------------------------------------- */
  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, "materialRequest", id);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          const data = snapshot.data();

          const requestDate = data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000)
                .toISOString()
                .split("T")[0]
            : data.createdAt || "";

          const totalRequired = Number(
            data.requiredMaterial || data.requestedMaterial || 0
          );
          const alreadyIssued = Number(data.issuedMeter || 0);
          // const remaining = totalRequired - alreadyIssued;
          const remaining =
            Math.round((totalRequired - alreadyIssued) * 100) / 100;

          setFormData({
            jobCardNo: data.jobCardNo || "",
            jobName: data.jobName || "",
            paperSize: data.paperSize || "",
            requestedMaterial: remaining > 0 ? remaining : 0,
            requestDate: requestDate,
            alloteDate: new Date().toISOString().split("T")[0],
            customerName: data.customerName || "",
          });

          setJobPaper(data.jobPaper?.value || data.jobPaper || "");
          setPaperProductCode(
            data.paperProductCode?.value || data.paperProductCode || ""
          );
        } else {
          setError("Request not found");
        }
      } catch (error) {
        console.error("Error fetching request:", error);
        setError("Failed to load request data");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  /* -------------------------------------------------------------
     2) FETCH MATERIALS WITH ROLL & RUNNING METER INFO
  --------------------------------------------------------------- */
  useEffect(() => {
    if (!paperProductCode || !jobPaper || !formData.paperSize) return;

    const fetchMaterials = async () => {
      setLoadingMaterials(true);

      try {
        const stringPaperSize = String(formData.paperSize);
        const numberPaperSize = Number(formData.paperSize);

        // Fetch orders for customer names
        const ordersSnapshot = await getDocs(collection(db, "ordersTest"));
        const ordersMap = {};
        ordersSnapshot.docs.forEach((doc) => {
          const orderData = doc.data();
          if (orderData.jobCardNo) {
            ordersMap[orderData.jobCardNo] = orderData.customerName || "-";
          }
        });

        const baseConditions = [
          where("paperProductCode", "==", paperProductCode),
          where("jobPaper", "==", jobPaper),
          where("paperSize", "in", [stringPaperSize, numberPaperSize]),
          where("isActive", "==", true),
        ];

        const getTimestamp = (timestamp) => {
          if (!timestamp) return 0;
          if (timestamp.seconds !== undefined) {
            return (
              timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000
            );
          }
          if (typeof timestamp.toMillis === "function") {
            return timestamp.toMillis();
          }
          if (timestamp instanceof Date) {
            return timestamp.getTime();
          }
          return 0;
        };

        // ✅ Helper function to calculate available rolls// ✅ Helper function to calculate available rolls
        const calculateAvailableRolls = (
          availableMeter,
          runningMeterPerRoll
        ) => {
          if (!runningMeterPerRoll || runningMeterPerRoll === 0) return 0;
          // Round to avoid floating point issues
          return Math.floor(
            Math.round((availableMeter / runningMeterPerRoll) * 100) / 100
          );
        };

        // ✅ RAW Materials Query
        const rawQuery = query(
          collection(db, "materials"),
          ...baseConditions,
          where("materialCategory", "==", "RAW")
        );

        const rawSnapshot = await getDocs(rawQuery);
        const rawList = rawSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const availableMeter = data.availableRunningMeter || 0;
            const runningMeter = data.runningMeter || 0;

            // ✅ Calculate current available rolls dynamically
            const currentAvailableRolls = calculateAvailableRolls(
              availableMeter,
              runningMeter
            );

            return {
              id: doc.id,
              ...data,
              paperCode: data.paperCode,
              availableMeter: availableMeter,
              totalRolls: data.roll || 0, // Original total rolls (for reference)
              runningMeter: runningMeter,
              currentAvailableRolls: currentAvailableRolls, // ✅ NEW: Current available rolls
              createdAt: data.createdAt,
            };
          })
          .sort(
            (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
          );

        // ✅ LO Materials Query (No customer filtering - can be used for any customer)
        const loQuery = query(
          collection(db, "materials"),
          ...baseConditions,
          where("materialCategory", "==", "LO")
        );

        const loSnapshot = await getDocs(loQuery);
        const loList = loSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              paperCode: data.paperCode,
              availableMeter: data.availableRunningMeter || 0,
              sourceJobCardNo: data.sourceJobCardNo,
              customerName: ordersMap[data.sourceJobCardNo] || "-",
              createdAt: data.createdAt,
            };
          })
          .sort(
            (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
          );

        // ✅ WIP Materials Query (Filter by customer name)
        const wipQuery = query(
          collection(db, "materials"),
          ...baseConditions,
          where("materialCategory", "==", "WIP")
        );

        const wipSnapshot = await getDocs(wipQuery);
        const wipList = wipSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              paperCode: data.paperCode,
              availableMeter: data.availableRunningMeter || 0,
              stage: data.sourceStage || "Unknown",
              sourceJobCardNo: data.sourceJobCardNo,
              customerName: ordersMap[data.sourceJobCardNo] || "-",
              createdAt: data.createdAt,
            };
          })
          // ✅ Filter WIP by customer name - only show materials from same customer
          .filter((wip) => {
            const wipCustomerName = wip.customerName.toLowerCase().trim();
            const currentCustomerName = (formData.customerName || "")
              .toLowerCase()
              .trim();
            return wipCustomerName === currentCustomerName;
          })
          .sort(
            (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
          );

        setRAW(rawList);
        setLO(loList);
        setWIP(wipList);
      } catch (error) {
        console.error("Error fetching materials:", error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [paperProductCode, jobPaper, formData.paperSize, formData.customerName]);

  /* -------------------------------------------------------------
     3) HELPER FUNCTION TO FORMAT DATE (DISPLAY ONLY)
  --------------------------------------------------------------- */
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return "N/A";
    }

    return date.toLocaleDateString("en-GB");
  };

  /* -------------------------------------------------------------
     4) FILTER FUNCTIONS FOR SEARCH
  --------------------------------------------------------------- */
  const filterMaterials = (materials, searchTerm, type) => {
    if (!searchTerm) return materials;

    const search = searchTerm.toLowerCase().trim();

    return materials.filter((item) => {
      const paperCode = (item.paperCode || "").toLowerCase();
      const availableMeter = String(item.availableMeter || "");
      // const rack = (item.rack || "").toLowerCase();
      const sourceJobCardNo = (item.sourceJobCardNo || "").toLowerCase();
      const customerName = (item.customerName || "").toLowerCase();
      const createdDate = formatDate(item.createdAt).toLowerCase();

      // Common fields for all types
      let matches =
        paperCode.includes(search) ||
        availableMeter.includes(search) ||
        // rack.includes(search) ||
        createdDate.includes(search);

      // Type-specific fields
      if (type === "RAW") {
        const totalRolls = String(item.totalRolls || "");
        const runningMeter = String(item.runningMeter || "");
        matches =
          matches ||
          totalRolls.includes(search) ||
          runningMeter.includes(search);
      }

      if (type === "LO" || type === "WIP") {
        matches =
          matches ||
          sourceJobCardNo.includes(search) ||
          customerName.includes(search);
      }

      if (type === "WIP") {
        const stage = (item.stage || "").toLowerCase();
        matches = matches || stage.includes(search);
      }

      return matches;
    });
  };

  // Add this helper function at the top of your component, after the imports

  const filteredLO = filterMaterials(LO, searchLO, "LO");
  const filteredWIP = filterMaterials(WIP, searchWIP, "WIP");
  const filteredRAW = filterMaterials(RAW, searchRAW, "RAW");

  /* -------------------------------------------------------------
     5) HANDLE SELECT / ISSUE METER & ROLLS CHANGE  
  --------------------------------------------------------------- */
  const handleSelect = (materialType, roll) => {
    const exists = selectedRolls.find((item) => item.id === roll.id);

    if (exists) {
      setSelectedRolls(selectedRolls.filter((item) => item.id !== roll.id));
    } else {
      // ✅ For RAW materials ONLY, calculate issued meter based on rolls
      // For LO/WIP, use available meter (manual entry) and NO roll tracking
      if (materialType === "RAW") {
        const defaultIssuedRolls = roll.currentAvailableRolls;
        const defaultIssuedMeter = roll.runningMeter * defaultIssuedRolls;

        setSelectedRolls([
          ...selectedRolls,
          {
            ...roll,
            materialType,
            issuedMeter: defaultIssuedMeter,
            issuedRolls: defaultIssuedRolls,
          },
        ]);
      } else {
        // LO/WIP: No roll tracking, only meter
        setSelectedRolls([
          ...selectedRolls,
          {
            ...roll,
            materialType,
            issuedMeter: roll.availableMeter,
            issuedRolls: 0, // Not applicable for LO/WIP
          },
        ]);
      }
    }
  };

  // ✅ Handle issued meter change - Only for LO/WIP (RAW is auto-calculated)
  const handleMeterChange = (id, meter) => {
    const roll = [...RAW, ...LO, ...WIP].find((r) => r.id === id);
    const selectedRoll = selectedRolls.find((r) => r.id === id);
    const meterValue = Number(meter);

    if (meterValue < 0) return;

    if (roll && meterValue > roll.availableMeter) {
      alert(
        `Issue meter cannot exceed available meter (${roll.availableMeter})`
      );
      return;
    }

    // ✅ Don't allow manual meter change for RAW materials
    if (selectedRoll && selectedRoll.materialType === "RAW") {
      alert(
        "For RAW materials, meter is automatically calculated based on rolls"
      );
      return;
    }

    setSelectedRolls((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, issuedMeter: meter } : item
      )
    );
  };

  // ✅ Handle issued rolls change - RAW ONLY
  const handleRollsChange = (id, rolls) => {
    const roll = [...RAW, ...LO, ...WIP].find((r) => r.id === id);
    const rollsValue = Number(rolls);

    if (rollsValue < 0) return;

    if (roll && rollsValue > roll.currentAvailableRolls) {
      alert(`Issued rolls cannot exceed available rolls (${roll.currentAvailableRolls})`);
      return;
    }

    setSelectedRolls((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // ✅ Auto-calculate meter for RAW materials only
          if (item.materialType === "RAW") {
            const calculatedMeter = roll.runningMeter * rollsValue;
            return {
              ...item,
              issuedRolls: rolls,
              issuedMeter: calculatedMeter,
            };
          }
        }
        return item;
      })
    );
  };

  const totalIssued = selectedRolls.reduce(
    (sum, item) => sum + Number(item.issuedMeter || 0),
    0
  );

  // ✅ Calculate total rolls issued (RAW only)
  const totalRollsIssued = selectedRolls.reduce((sum, item) => {
    if (item.materialType === "RAW") {
      return sum + Number(item.issuedRolls || 0);
    }
    return sum;
  }, 0);

  /* -------------------------------------------------------------
     6) ISSUE MATERIAL & SUBTRACT STOCK IN FIRESTORE + UPDATE ORDER
  --------------------------------------------------------------- */
  const handleIssue = async () => {
    if (selectedRolls.length === 0) {
      alert("Please select at least one material to issue");
      return;
    }

    // ✅ Validate rolls are entered FOR RAW MATERIALS ONLY
    const missingRolls = selectedRolls.filter(
      (roll) =>
        roll.materialType === "RAW" &&
        (!roll.issuedRolls || Number(roll.currentAvailableRolls) <= 0)
    );

    if (missingRolls.length > 0) {
      alert(
        "Please enter the number of rolls to issue for all selected RAW materials"
      );
      return;
    }

    const invalidRolls = selectedRolls.filter(
      (roll) => Number(roll.issuedMeter) > roll.availableMeter
    );

    if (invalidRolls.length > 0) {
      alert(
        `Cannot issue more than available stock for: ${invalidRolls
          .map((r) => r.paperCode)
          .join(", ")}`
      );
      return;
    }

    // ✅ Validate roll counts FOR RAW MATERIALS ONLY
    const invalidRollCounts = selectedRolls.filter(
      (roll) =>
        roll.materialType === "RAW" &&
        Number(roll.issuedRolls) > roll.totalRolls
    );

    if (invalidRollCounts.length > 0) {
      alert(
        `Cannot issue more rolls than available for: ${invalidRollCounts
          .map((r) => r.paperCode)
          .join(", ")}`
      );
      return;
    }

    try {
      // STEP 1: Deduct stock + create transactions
      for (const roll of selectedRolls) {
        const issuedQty = Number(roll.issuedMeter);
        const issuedRollCount =
          roll.materialType === "RAW" ? Number(roll.issuedRolls) : 0;
        const newAvailableMeter = roll.availableMeter - issuedQty;

        await updateDoc(doc(db, "materials", roll.id), {
          availableRunningMeter: newAvailableMeter,
          isActive: newAvailableMeter > 0,
          updatedAt: new Date(),
        });

        const transactionData = {
          transactionType: "issue",
          transactionDate: serverTimestamp(),
          jobCardNo: formData.jobCardNo,
          paperCode: roll.paperCode,
          paperProductCode: roll.paperProductCode,
          materialCategory: roll.materialCategory || "RAW",
          usedQty: issuedQty,
          wasteQty: 0,
          loQty: 0,
          wipQty: 0,
          stage: null,
          newPaperCode: null,
          newMaterialId: null,
          createdBy: "Admin",
        };

        // ✅ Only add roll count for RAW materials
        if (roll.materialType === "RAW") {
          transactionData.issuedRolls = issuedRollCount;
          transactionData.remarks = `Issued ${issuedQty}m (${issuedRollCount} rolls) for job ${formData.jobCardNo}`;
        } else {
          transactionData.remarks = `Issued ${issuedQty}m for job ${formData.jobCardNo}`;
        }

        await addDoc(collection(db, "materialTransactions"), transactionData);
      }

      // STEP 2: Get previous issued/remaining values
      const reqRef = doc(db, "materialRequest", id);
      const reqSnap = await getDoc(reqRef);

      let prevIssued = 0;
      let originalRequestedMeter = 0;

      if (reqSnap.exists()) {
        const reqData = reqSnap.data();
        prevIssued = Number(reqData.issuedMeter || 0);
        originalRequestedMeter = Number(
          reqData.requiredMaterial || reqData.requestedMaterial || 0
        );
      }

      // STEP 3: Calculate new totals
      const newIssuedTotal = prevIssued + totalIssued;
      let remainingMeter = originalRequestedMeter - newIssuedTotal;
      if (remainingMeter < 0) remainingMeter = 0;

      const isIssued = newIssuedTotal >= originalRequestedMeter;

      // STEP 4: Update materialRequest document
      await updateDoc(reqRef, {
        issuedMeter: newIssuedTotal,
        remainingMeter: remainingMeter,
        isIssued: isIssued,
        updatedAt: new Date(),
      });

      // STEP 5: Update ordersTest with allocated materials
      const ordersQuery = query(
        collection(db, "ordersTest"),
        where("jobCardNo", "==", formData.jobCardNo)
      );

      const ordersSnapshot = await getDocs(ordersQuery);

      if (!ordersSnapshot.empty) {
        const orderDoc = ordersSnapshot.docs[0];
        const orderRef = doc(db, "ordersTest", orderDoc.id);
        const currentOrderData = orderDoc.data();

        const findNextAvailableIndex = () => {
          let index = 0;
          while (
            currentOrderData[`paperProductCode${index === 0 ? "" : index}`]
          ) {
            index++;
          }
          return index;
        };

        const materialUpdates = {};

        selectedRolls.forEach((roll) => {
          const targetIndex = findNextAvailableIndex();
          const suffix = targetIndex === 0 ? "" : targetIndex;

          const productData = paperProductCodeData.find(
            (item) => item.value === roll.paperProductCode
          );

          materialUpdates[`paperProductCode${suffix}`] = {
            label: productData?.label || roll.paperProductCode,
            value: roll.paperProductCode,
          };

          materialUpdates[`paperProductNo${suffix}`] = roll.paperCode;

          materialUpdates[`jobPaper${suffix}`] = {
            label: roll.jobPaper || "-",
            value: roll.jobPaper || "-",
          };

          materialUpdates[`allocatedQty${suffix}`] = Number(roll.issuedMeter);

          // ✅ Only store roll count for RAW materials
          if (roll.materialType === "RAW") {
            materialUpdates[`allocatedRolls${suffix}`] = Number(
              roll.issuedRolls
            );
          }

          materialUpdates[`materialCategory${suffix}`] =
            roll.materialCategory || "RAW";

          // ✅ ADD THIS: Store allocation timestamp
          materialUpdates[`allocatedAt${suffix}`] = new Date();

          currentOrderData[`paperProductCode${suffix}`] =
            materialUpdates[`paperProductCode${suffix}`];
        });

        await updateDoc(orderRef, {
          ...materialUpdates,
          materialAllotStatus: "Allocated",
          updatedAt: new Date(),
          paperSize: formData.paperSize,
        });

        console.log(
          "✅ Order updated with allocated materials:",
          materialUpdates
        );
      } else {
        console.warn("⚠️ No order found with jobCardNo:", formData.jobCardNo);
      }

      setShowPopup(true);
      setSelectedRolls([]);

      setTimeout(() => navigate("/issue_material"), 1200);
    } catch (err) {
      console.error("Error issuing material:", err);
      alert("Error issuing material: " + err.message);
    }
  };

  /* -------------------------------------------------------------
     7) INPUT HANDLER
  --------------------------------------------------------------- */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* -------------------------------------------------------------
     LOADING & ERROR STATES
  --------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <h1>Issue Material</h1>
        <hr className="mb-6" />
        <div className="py-16 bg-[#F6F6F6] rounded-2xl container">
          <div className="text-center">
            <p className="text-xl">Loading request data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1>Issue Material</h1>
        <hr className="mb-6" />
        <div className="py-16 bg-[#F6F6F6] rounded-2xl container">
          <div className="text-center text-red-600">
            <p className="text-xl">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     UI COMPONENT
  --------------------------------------------------------------- */
  return (
    <>
      <div className="space-y-4 ">
        <div className="flex justify-between items-baseline">
          <h1>Issue Material</h1>
          <BackButton />
        </div>

        <hr className="mb-6" />

        <div className="py-16 bg-[#F6F6F6] rounded-2xl container space-y-8">
          <div className="grid md:grid-cols-2 gap-8 ">
            <Input
              label="Job Card No"
              name="jobCardNo"
              value={formData.jobCardNo}
              onChange={handleChange}
              readOnly
            />
            <Input
              label="Job Name"
              name="jobName"
              value={formData.jobName}
              onChange={handleChange}
              readOnly
            />
            <Input
              label="Customer Name"
              name="customerName"
              value={formData.customerName}
              readOnly
            />
            <Input
              label="Paper Size"
              name="paperSize"
              value={formData.paperSize}
              onChange={handleChange}
            />
            <Input
              label="Remaining Material"
              name="requestedMaterial"
              value={formData.requestedMaterial}
              onChange={handleChange}
              readOnly
            />

            <select
              className="inputStyle"
              value={jobPaper}
              onChange={(e) => {
                setJobPaper(e.target.value);
                setSelectedRolls([]);
              }}
            >
              <option value="">Select Material Type</option>
              {materialTypeList.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              className="inputStyle"
              value={paperProductCode}
              onChange={(e) => {
                setPaperProductCode(e.target.value);
                setSelectedRolls([]);
              }}
            >
              <option value="">Select Company Name</option>
              {paperProductCodeData.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <Input
              label="Request Date"
              type="date"
              name="requestDate"
              value={formData.requestDate}
              onChange={handleChange}
            />
            <Input
              label="Allote Date"
              type="date"
              name="alloteDate"
              value={formData.alloteDate}
              onChange={handleChange}
            />
          </div>

          <hr />

          {loadingMaterials ? (
            <div className="text-center py-8">
              <p className="text-lg">Loading materials...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* LO Section */}
              <div className="space-y-3">
                <h2 className="flex items-center ">
                  <span>
                    <FaCaretRight className="text-2xl" />
                  </span>
                  Leftover (LO)
                </h2>

                <SearchBar
                  value={searchLO}
                  onChange={setSearchLO}
                  placeholder="Search LO materials (Paper Code, Available Meter, Source Job, Customer, Date...)"
                />

                <MaterialTable
                  title="Leftover (LO)"
                  data={filteredLO}
                  type="LO"
                  onSelect={handleSelect}
                  selected={selectedRolls}
                  onMeterChange={handleMeterChange}
                  onRollsChange={handleRollsChange}
                  formatDate={formatDate}
                />
              </div>

              {/* WIP Section */}
              <div className="space-y-3">
                <h2 className="flex items-center ">
                  <span>
                    <FaCaretRight className="text-2xl" />
                  </span>
                  Work In Process (WIP)
                </h2>

                <SearchBar
                  value={searchWIP}
                  onChange={setSearchWIP}
                  placeholder="Search WIP materials (Paper Code, Stage, Available Meter, Source Job, Customer, Date...)"
                />

                <MaterialTable
                  title="Work In Process (WIP)"
                  data={filteredWIP}
                  type="WIP"
                  onSelect={handleSelect}
                  selected={selectedRolls}
                  onMeterChange={handleMeterChange}
                  onRollsChange={handleRollsChange}
                  formatDate={formatDate}
                />
              </div>

              {/* RAW Section */}
              <div className="space-y-3">
                <h2 className="flex items-center ">
                  <span>
                    <FaCaretRight className="text-2xl" />
                  </span>
                  Raw Material
                </h2>

                <SearchBar
                  value={searchRAW}
                  onChange={setSearchRAW}
                  placeholder="Search RAW materials (Paper Code, Rolls, Running Meter, Available Meter, Date...)"
                />

                <MaterialTable
                  title="Raw Material"
                  data={filteredRAW}
                  type="RAW"
                  onSelect={handleSelect}
                  selected={selectedRolls}
                  onMeterChange={handleMeterChange}
                  onRollsChange={handleRollsChange}
                  formatDate={formatDate}
                />
              </div>
            </div>
          )}

          <div className="shadow-xl rounded-2xl bg-white overflow-x-auto">
            <table className="w-full border text-xl text-center">
              <thead className="">
                <tr className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white">
                  <th className="p-2 border">Material Type</th>
                  <th className="p-2 border">Paper Code</th>
                  <th className="p-2 border">Rolls</th>
                  <th className="p-2 border">Issued Meter</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {selectedRolls.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-gray-500">
                      No materials selected
                    </td>
                  </tr>
                ) : (
                  selectedRolls.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2 border">{item.materialType}</td>
                      <td className="p-2 border">{item.paperCode}</td>
                      <td className="p-2 border">
                        {item.materialType === "RAW"
                          ? item.issuedRolls || 0
                          : "-"}
                      </td>
                      <td className="p-2 border">{item.issuedMeter}m</td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="font-bold bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white">
                  <td className="p-2 border" colSpan={2}>
                    Total
                  </td>
                  <td className="p-2 border">
                    {totalRollsIssued > 0 ? `${totalRollsIssued} Rolls` : "-"}
                  </td>
                  <td className="p-2 border">{totalIssued}m</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <PrimaryBtn onClick={handleIssue} className="w-full">
            Issue Material
          </PrimaryBtn>
        </div>
      </div>
      {showPopup && (
        <SuccessPopup
          message="Material issued successfully!"
          show={showPopup}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  );
};

export default MaterialIssueForm;

/* ---------------- Helper Components ---------------- */

const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  readOnly = false,
}) => (
  <div className="flex flex-col space-y-1">
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className={`inputStyle ${
        readOnly ? "bg-gray-100 cursor-not-allowed" : ""
      }`}
      placeholder={label}
      readOnly={readOnly}
    />
  </div>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="w-full relative">
    <input
      type="text"
      placeholder={placeholder}
      className="border border-gray-300 rounded-lg w-full p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <FiSearch className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
  </div>
);

const MaterialTable = ({
  title,
  data,
  type,
  onSelect,
  selected,
  onMeterChange,
  onRollsChange,
  formatDate,
}) => {
  const isRawMaterial = type === "RAW";

  return (
    <div className="mb-10 shadow-xl rounded-2xl bg-white overflow-x-auto">
      <table className="w-full border text-base md:text-lg lg:text-xl text-center">
        <thead>
          <tr className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white">
            <th className="p-2 border">Select</th>
            <th className="p-2 border">Paper Code</th>
            {isRawMaterial && <th className="p-2 border">Rolls</th>}
            {isRawMaterial && <th className="p-2 border">Running Meter</th>}
            <th className="p-2 border">Available Meter</th>
            <th className="p-2 border">Created Date</th>

            {title.includes("WIP") && <th className="p-2 border">Stage</th>}
            {(title.includes("WIP") || title.includes("LO")) && (
              <>
                <th className="p-2 border">Source Job</th>
                <th className="p-2 border">Customer Name</th>
              </>
            )}

            {/* <th className="p-2 border">Rack</th> */}
            {isRawMaterial && <th className="p-2 border">Rolls to Issue</th>}
            <th className="p-2 border">
              Issue Meter
              {isRawMaterial && (
                <span className="text-xs block">(Auto-calculated)</span>
              )}
            </th>
          </tr>
        </thead>

        <tbody className="text-base">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={
                  isRawMaterial
                    ? 9
                    : title.includes("WIP")
                    ? 8
                    : title.includes("LO")
                    ? 7
                    : 5
                }
                className="p-4 text-gray-500"
              >
                No materials available
              </td>
            </tr>
          ) : (
            data.map((roll) => {
              const isChecked = selected.some((s) => s.id === roll.id);
              const selectedRoll = selected.find((s) => s.id === roll.id);

              return (
                <tr key={roll.id}>
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onSelect(type, roll)}
                    />
                  </td>

                  <td className="p-2 border">{roll.paperCode}</td>

                  {/* ✅ RAW ONLY: Show Rolls and Running Meter */}
                  {isRawMaterial && (
                    <>
                      <td className="p-2 border font-semibold">
                        {/* {roll.totalRolls || 0} */}
                        {roll.currentAvailableRolls || 0}
                      </td>
                      <td className="p-2 border font-semibold">
                        {roll.runningMeter || 0}m
                      </td>
                    </>
                  )}

                  <td className="p-2 border">{roll.availableMeter}m</td>
                  <td className="p-2 border">{formatDate(roll.createdAt)}</td>

                  {title.includes("WIP") && (
                    <td className="p-2 border capitalize">{roll.stage}</td>
                  )}
                  {(title.includes("WIP") || title.includes("LO")) && (
                    <>
                      <td className="p-2 border">
                        {roll.sourceJobCardNo || "N/A"}
                      </td>
                      <td className="p-2 border">{roll.customerName || "-"}</td>
                    </>
                  )}

                  {/* <td className="p-2 border">{roll.rack}</td> */}

                  {/* ✅ RAW ONLY: Rolls to Issue Input */}
                  {isRawMaterial && (
                    <td className="p-2 border">
                      <input
                        type="number"
                        className="border p-1 rounded w-20"
                        disabled={!isChecked}
                        value={selectedRoll?.issuedRolls || ""}
                        onChange={(e) => onRollsChange(roll.id, e.target.value)}
                        placeholder="rolls"
                        // max={roll.totalRolls}
                        max={roll.currentAvailableRolls}
                        min="0"
                      />
                    </td>
                  )}

                  {/* Issue Meter Input */}
                  <td className="p-2 border">
                    <input
                      type="number"
                      className={`border p-1 rounded w-24 ${
                        isRawMaterial ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      disabled={!isChecked || isRawMaterial}
                      value={selectedRoll?.issuedMeter || ""}
                      onChange={(e) => onMeterChange(roll.id, e.target.value)}
                      placeholder={isRawMaterial ? "auto" : "meter"}
                      max={roll.availableMeter}
                      min="0"
                      title={
                        isRawMaterial
                          ? "Auto-calculated based on rolls"
                          : "Enter meter manually"
                      }
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
