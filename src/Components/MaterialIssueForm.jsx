import {
  doc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { useParams } from "react-router-dom";

const MaterialIssueForm = () => {
  const [selectedRolls, setSelectedRolls] = useState([]);

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

  const [RAW, setRAW] = useState([]); // 🔥 Now dynamic Firestore data

  const { id } = useParams();

  /* -------------------------------------------------------------
     1) FETCH REQUEST DATA BY ID (DYNAMIC) + ADD STATIC OVERRIDE
  --------------------------------------------------------------- */
  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;

    //   const ref = doc(db, "materialRequests", id);
    //   const snapshot = await getDoc(ref);
          setFormData((prev) => ({
          ...prev,
          companyName: "Sun Paper",
          materialType: "PP Silver",
          paperSize: "400",
        }));

    //   if (snapshot.exists()) {
    //     const data = snapshot.data();

    //     setFormData((prev) => ({
    //       ...prev,
    //       ...data,

    //       // 🔥 STATIC VALUES (REMOVE LATER EASILY)
    //       companyName: data.companyName || "Sun Paper",
    //       materialType: data.materialType || "PP Silver",
    //       paperSize: data.paperSize || "400",
    //     }));
    //   }
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
      const q = query(
        collection(db, "materials"),
        where("companyName", "==", formData.companyName),
        where("materialType", "==", formData.materialType),
        where("paperSize", "==", formData.paperSize)
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
    };

    fetchRawMaterials();
  }, [formData]);

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
    try {
      for (const roll of selectedRolls) {
        const newMeter = roll.totalRunningMeter - Number(roll.issuedMeter);

        await updateDoc(doc(db, "materials", roll.id), {
          totalRunningMeter: newMeter,
          updatedAt: new Date(),
        });
      }

      alert("Material issued successfully!");
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
     UI COMPONENT
  --------------------------------------------------------------- */
  return (
    <div className="w-full flex justify-center">
      <div className="max-w-3xl w-full p-6 space-y-10 border rounded-lg shadow bg-white">
        <h2 className="text-xl font-bold mb-3">Issue Material</h2>

        {/* --- TOP FORM --- */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Job Card No"
            name="jobCardNo"
            value={formData.jobCardNo}
            onChange={handleChange}
          />
          <Input
            label="Job Name"
            name="jobName"
            value={formData.jobName}
            onChange={handleChange}
          />
          <Input
            label="Paper Size"
            name="paperSize"
            value={formData.paperSize}
            onChange={handleChange}
          />
          <Input
            label="Requested Material"
            name="requestedMaterial"
            value={formData.requestedMaterial}
            onChange={handleChange}
          />
          <Input
            label="Material Type"
            name="materialType"
            value={formData.materialType}
            onChange={handleChange}
          />
          <Input
            label="Company Name"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
          />
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

        {/* MATERIAL TABLES */}
        <MaterialTable
          title="Leftover (LO)"
          data={LO}
          type="LO"
          onSelect={handleSelect}
          selected={selectedRolls}
          onMeterChange={handleMeterChange}
        />
        <MaterialTable
          title="Work In Process (WIP)"
          data={WIP}
          type="WIP"
          onSelect={handleSelect}
          selected={selectedRolls}
          onMeterChange={handleMeterChange}
        />
        <MaterialTable
          title="Raw Material"
          data={RAW}
          type="RAW"
          onSelect={handleSelect}
          selected={selectedRolls}
          onMeterChange={handleMeterChange}
        />

        {/* SELECTED MATERIAL SUMMARY */}
        <div>
          <h2 className="font-bold text-lg mb-3">Selected Material</h2>

          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2 border">Material Type</th>
                <th className="p-2 border">Paper Code</th>
                <th className="p-2 border">Issued Meter</th>
              </tr>
            </thead>
            <tbody>
              {selectedRolls.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 border">{item.materialType}</td>
                  <td className="p-2 border">{item.paperCode}</td>
                  <td className="p-2 border">{item.issuedMeter}</td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="font-bold bg-gray-100">
                <td className="p-2 border" colSpan={2}>
                  Total Meter
                </td>
                <td className="p-2 border">{totalIssued}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow w-full"
          onClick={handleIssue}
        >
          ISSUE NOW
        </button>
      </div>
    </div>
  );
};

export default MaterialIssueForm;

/* ---------------- Helper Components ---------------- */

const Input = ({ label, name, value, onChange, type = "text" }) => (
  <div className="flex flex-col space-y-1">
    <label className="text-sm font-medium">{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className="border p-2 rounded w-full"
      placeholder={label}
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
  <div className="mb-10">
    <h2 className="font-bold text-lg mb-3">{title}</h2>

    <table className="w-full border text-sm mb-6">
      <thead>
        <tr className="bg-gray-200">
          <th className="p-2 border">Select</th>
          <th className="p-2 border">Paper Code</th>
          <th className="p-2 border">Available Meter</th>

          {title.includes("WIP") && <th className="p-2 border">Stage</th>}

          <th className="p-2 border">Rack</th>
          <th className="p-2 border">Issue Meter</th>
        </tr>
      </thead>

      <tbody>
        {data.map((roll) => {
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
        })}
      </tbody>
    </table>
  </div>
);
