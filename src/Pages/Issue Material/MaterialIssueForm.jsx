import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { useParams } from "react-router-dom";
import PrimaryBtn from "../../Components/PrimaryBtn";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { FaCaretRight } from "react-icons/fa6";
import { paperProductCodeData } from "../../utils/constant";

const MaterialIssueForm = () => {
  const [selectedRolls, setSelectedRolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  const [formData, setFormData] = useState({
    jobCardNo: "",
    jobName: "",
    paperSize: "",
    requestedMaterial: "",
    materialType: "",
    companyName: "",
    requestDate: "",
    alloteDate: "",
  });
  const [paperProductCode, setPaperProductCode] = useState("");

  const LO = [{ id: 1, paperCode: "P101", availableMeter: 1000, rack: "R1" }];
  const WIP = [
    {
      id: 2,
      paperCode: "W202",
      availableMeter: 800,
      rack: "S2",
      stage: "Printing",
    },
  ];

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

          const requestDate = data.requestDate?.seconds
            ? new Date(data.requestDate.seconds * 1000)
                .toISOString()
                .split("T")[0]
            : data.requestDate || "";

          setFormData({
            jobCardNo: data.jobCardNo || "",
            jobName: data.jobName || "",
            paperSize: data.paperSize || "",
            requestedMaterial:
              data.requiredMaterial || data.requestedMaterial || "",
            materialType: data.materialType || "",
            companyName: data.companyName || "",
            requestDate: requestDate,
            alloteDate: new Date().toISOString().split("T")[0],
          });
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
     2) FETCH MATCHING MATERIALS BASED ON formData
  --------------------------------------------------------------- */
  useEffect(() => {
    if (!formData.companyName || !formData.materialType || !formData.paperSize)
      return;

    const fetchRawMaterials = async () => {
      setLoadingMaterials(true);
      try {
        const q = query(
          collection(db, "materials"),
          where("paperProductCode", "==", formData.companyName),
          where("jobPaper", "==", formData.materialType),
          where("paperSize", "==", Number(formData.paperSize))
        );
        const snapshot = await getDocs(q);

        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          paperCode: doc.data().paperCode,
          availableMeter: doc.data().totalRunningMeter,
          rack: doc.data().rack || "N/A",
        }));

        setRAW(list);
      } catch (error) {
        console.error("Error fetching materials:", error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchRawMaterials();
  }, [formData.companyName, formData.materialType, formData.paperSize]);

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
     4) ISSUE MATERIAL & SUBTRACT STOCK IN FIRESTORE
  --------------------------------------------------------------- */
  const handleIssue = async () => {
    if (selectedRolls.length === 0) {
      alert("Please select at least one material to issue");
      return;
    }

    try {
      for (const roll of selectedRolls) {
        const newMeter = roll.totalRunningMeter - Number(roll.issuedMeter);

        await updateDoc(doc(db, "materials", roll.id), {
          totalRunningMeter: newMeter,
          updatedAt: new Date(),
        });
      }

      alert("Material issued successfully!");
      setSelectedRolls([]);
    } catch (err) {
      console.error(err);
      alert("Error issuing material");
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
        {/* --- TOP FORM --- */}
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
            // readOnly
          />
          <Input
            label="Requested Material"
            name="requestedMaterial"
            value={formData.requestedMaterial}
            onChange={handleChange}
            // readOnly
          />
          <Input
            label="Material Type"
            name="materialType"
            value={formData.materialType}
            onChange={handleChange}
            // readOnly
          />

          <select
            className="inputStyle"
            value={paperProductCode}
            onChange={(e) => {
              setPaperProductCode(e.target.value);
              // setErrors((prev) => ({ ...prev, paperProductCode: "" }));
            }}
            // disabled={isEdit}
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
          <Input
            label="Request Date"
            type="date"
            name="requestDate"
            value={formData.requestDate}
            onChange={handleChange}
            // readOnly
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

        {/* MATERIAL TABLES */}
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

        {/* SELECTED MATERIAL SUMMARY */}
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

          <th className="p-2 border">Rack</th>
          <th className="p-2 border">Issue Meter</th>
        </tr>
      </thead>

      <tbody className="text-base">
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={title.includes("WIP") ? 6 : 5}
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
                  <td className="p-2 border">{roll.stage}</td>
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
