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
import { materialTypeList, paperProductCodeData } from "../../utils/constant";

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
  });

  const [jobPaper, setJobPaper] = useState("");
  const [paperProductCode, setPaperProductCode] = useState("");

  const [LO, setLO] = useState([]);
  const [WIP, setWIP] = useState([]);
  const [RAW, setRAW] = useState([]);

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

          // ✅ Calculate remaining material correctly
          const totalRequired = Number(
            data.requiredMaterial || data.requestedMaterial || 0
          );
          const alreadyIssued = Number(data.issuedMeter || 0);
          const remaining = totalRequired - alreadyIssued;

          setFormData({
            jobCardNo: data.jobCardNo || "",
            jobName: data.jobName || "",
            paperSize: data.paperSize || "",
            requestedMaterial: remaining > 0 ? remaining : 0,
            requestDate: requestDate,
            alloteDate: new Date().toISOString().split("T")[0],
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

  useEffect(() => {
    if (!paperProductCode || !jobPaper || !formData.paperSize) return;

    const fetchMaterials = async () => {
      setLoadingMaterials(true);

      try {
        const stringPaperSize = String(formData.paperSize);
        const numberPaperSize = Number(formData.paperSize);

        const baseConditions = [
          where("paperProductCode", "==", paperProductCode),
          where("jobPaper", "==", jobPaper),
          where("paperSize", "in", [stringPaperSize, numberPaperSize]),
          where("isActive", "==", true),
        ];

        const rawQuery = query(
          collection(db, "materials"),
          ...baseConditions,
          where("materialCategory", "==", "RAW")
        );

        const rawSnapshot = await getDocs(rawQuery);
        const rawList = rawSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          paperCode: doc.data().paperCode,
          availableMeter: doc.data().availableRunningMeter || 0,
          rack: doc.data().rack || "N/A",
        }));

        const loQuery = query(
          collection(db, "materials"),
          ...baseConditions,
          where("materialCategory", "==", "LO")
        );

        const loSnapshot = await getDocs(loQuery);
        const loList = loSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          paperCode: doc.data().paperCode,
          availableMeter: doc.data().availableRunningMeter || 0,
          rack: doc.data().rack || "N/A",
          sourceJobCardNo: doc.data().sourceJobCardNo,
        }));

        const wipQuery = query(
          collection(db, "materials"),
          ...baseConditions,
          where("materialCategory", "==", "WIP")
        );

        const wipSnapshot = await getDocs(wipQuery);
        const wipList = wipSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          paperCode: doc.data().paperCode,
          availableMeter: doc.data().availableRunningMeter || 0,
          rack: doc.data().rack || "N/A",
          stage: doc.data().sourceStage || "Unknown",
          sourceJobCardNo: doc.data().sourceJobCardNo,
        }));

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
  }, [paperProductCode, jobPaper, formData.paperSize]);

  /* -------------------------------------------------------------
     3) HANDLE SELECT / ISSUE METER CHANGE  
  --------------------------------------------------------------- */
  const handleSelect = (materialType, roll) => {
    const exists = selectedRolls.find((item) => item.id === roll.id);

    if (exists) {
      setSelectedRolls(selectedRolls.filter((item) => item.id !== roll.id));
    } else {
      setSelectedRolls([
        ...selectedRolls,
        {
          ...roll,
          materialType,
          issuedMeter: roll.availableMeter,
        },
      ]);
    }
  };

  const handleMeterChange = (id, meter) => {
    setSelectedRolls((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, issuedMeter: meter } : item
      )
    );
  };

  const totalIssued = selectedRolls.reduce(
    (sum, item) => sum + Number(item.issuedMeter),
    0
  );

  /* -------------------------------------------------------------
     4) ISSUE MATERIAL & SUBTRACT STOCK IN FIRESTORE + UPDATE ORDER
  --------------------------------------------------------------- */
  const handleIssue = async () => {
    if (selectedRolls.length === 0) {
      alert("Please select at least one material to issue");
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

    try {
      // STEP 1: Deduct stock + create transactions
      for (const roll of selectedRolls) {
        const issuedQty = Number(roll.issuedMeter);
        const newAvailableMeter = roll.availableMeter - issuedQty;

        await updateDoc(doc(db, "materials", roll.id), {
          availableRunningMeter: newAvailableMeter,
          isActive: newAvailableMeter > 0,
          updatedAt: new Date(),
        });

        await addDoc(collection(db, "materialTransactions"), {
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
          remarks: `Issued ${issuedQty}m for job ${formData.jobCardNo}`,
        });
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

      // Only mark as issued when fully allocated
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

        // ✅ FIX: Find next available index for each roll separately
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

        // ✅ FIX: Create separate entries for EACH selected roll
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

          // ✅ Store individual paperCode, not comma-separated list
          materialUpdates[`paperProductNo${suffix}`] = roll.paperCode;

          // ✅ Store individual issuedMeter for this specific roll
          materialUpdates[`allocatedQty${suffix}`] = Number(roll.issuedMeter);

          // ✅ Store material category for this specific roll
          materialUpdates[`materialCategory${suffix}`] =
            roll.materialCategory || "RAW";

          // Update the currentOrderData to reflect the new entry
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

      alert("Material issued successfully! Job status updated to 'Allocated'.");
      setSelectedRolls([]);

      setTimeout(() => navigate("/issue_material"), 900);
    } catch (err) {
      console.error("Error issuing material:", err);
      alert("Error issuing material: " + err.message);
    }
  };

  /* -------------------------------------------------------------
     5) INPUT HANDLER
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
    <div className="space-y-4 ">
      <h1>Issue Material</h1>
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
            <h2 className="flex items-center ">
              <span>
                <FaCaretRight className="text-2xl" />
              </span>
              Leftover (LO)
            </h2>
            <MaterialTable
              title="Leftover (LO)"
              data={LO}
              type="LO"
              onSelect={handleSelect}
              selected={selectedRolls}
              onMeterChange={handleMeterChange}
            />
            <h2 className="flex items-center ">
              <span>
                <FaCaretRight className="text-2xl" />
              </span>
              Work In Process (WIP)
            </h2>
            <MaterialTable
              title="Work In Process (WIP)"
              data={WIP}
              type="WIP"
              onSelect={handleSelect}
              selected={selectedRolls}
              onMeterChange={handleMeterChange}
            />
            <h2 className="flex items-center ">
              <span>
                <FaCaretRight className="text-2xl" />
              </span>
              Raw Material
            </h2>
            <MaterialTable
              title="Raw Material"
              data={RAW}
              type="RAW"
              onSelect={handleSelect}
              selected={selectedRolls}
              onMeterChange={handleMeterChange}
            />
          </div>
        )}

        <div className="shadow-xl rounded-2xl bg-white overflow-x-auto">
          <table className="w-full border text-xl text-center">
            <thead className="">
              <tr className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white">
                <th className="p-2 border">Material Type</th>
                <th className="p-2 border">Paper Code</th>
                <th className="p-2 border">Issued Meter</th>
              </tr>
            </thead>
            <tbody className="text-base">
              {selectedRolls.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-gray-500">
                    No materials selected
                  </td>
                </tr>
              ) : (
                selectedRolls.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2 border">{item.materialType}</td>
                    <td className="p-2 border">{item.paperCode}</td>
                    <td className="p-2 border">{item.issuedMeter}</td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="font-bold bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white">
                <td className="p-2 border" colSpan={2}>
                  Total Meter
                </td>
                <td className="p-2 border">{totalIssued}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <PrimaryBtn onClick={handleIssue} className="w-full">
          Issue Material
        </PrimaryBtn>
      </div>
    </div>
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

const MaterialTable = ({
  title,
  data,
  type,
  onSelect,
  selected,
  onMeterChange,
}) => (
  <div className="mb-10 shadow-xl rounded-2xl bg-white overflow-x-auto">
    <table className="w-full border text-base md:text-lg lg:text-xl text-center">
      <thead>
        <tr className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white">
          <th className="p-2 border">Select</th>
          <th className="p-2 border">Paper Code</th>
          <th className="p-2 border">Available Meter</th>

          {title.includes("WIP") && <th className="p-2 border">Stage</th>}
          {(title.includes("WIP") || title.includes("LO")) && (
            <th className="p-2 border">Source Job</th>
          )}

          <th className="p-2 border">Rack</th>
          <th className="p-2 border">Issue Meter</th>
        </tr>
      </thead>

      <tbody className="text-base">
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={title.includes("WIP") ? 7 : title.includes("LO") ? 6 : 5}
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
                <td className="p-2 border">{roll.availableMeter}</td>

                {title.includes("WIP") && (
                  <td className="p-2 border capitalize">{roll.stage}</td>
                )}
                {(title.includes("WIP") || title.includes("LO")) && (
                  <td className="p-2 border">
                    {roll.sourceJobCardNo || "N/A"}
                  </td>
                )}

                <td className="p-2 border">{roll.rack}</td>

                <td className="p-2 border">
                  <input
                    type="number"
                    className="border p-1 rounded w-24"
                    disabled={!isChecked}
                    value={selectedRoll?.issuedMeter || ""}
                    onChange={(e) => onMeterChange(roll.id, e.target.value)}
                    placeholder="meter"
                    max={roll.availableMeter}
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
