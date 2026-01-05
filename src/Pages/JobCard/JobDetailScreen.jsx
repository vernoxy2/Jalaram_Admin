import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import BackButton from "../../Components/BackButton";

const JobDetailsScreen = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTime, setTotalTime] = useState(null);
  const [totalB, setTotalB] = useState(0);
  const [totalC, setTotalC] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [allocatedMaterials, setAllocatedMaterials] = useState([]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "ordersTest", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const orderData = { id: docSnap.id, ...docSnap.data() };
          setOrder(orderData);

          // Extract allocated materials
          const materials = [];

          // Check for main paper product
          if (orderData.paperProductCode) {
            materials.push({
              code: orderData.paperProductCode,
              number: orderData.paperProductNo || "",
              allocatedQty: orderData.allocatedQty || 0,
              materialCategory: orderData.materialCategory || "RAW",
              index: 0,
            });
          }

          // Check for additional paper products (paperProductCode1-10)
          for (let i = 1; i <= 10; i++) {
            const codeKey = `paperProductCode${i}`;
            const numberKey = `paperProductNo${i}`;
            const qtyKey = `allocatedQty${i}`;
            const categoryKey = `materialCategory${i}`;

            if (orderData[codeKey]) {
              materials.push({
                code: orderData[codeKey],
                number: orderData[numberKey] || "",
                allocatedQty: orderData[qtyKey] || 0,
                materialCategory: orderData[categoryKey] || "RAW",
                index: i,
              });
            }
          }

          setAllocatedMaterials(materials);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (order && order.endTime) {
      const startTimestamp = order.updatedAt || order.updatedByPunchingAt;

      if (startTimestamp) {
        const start = startTimestamp.seconds
          ? new Date(startTimestamp.seconds * 1000)
          : new Date(startTimestamp);
        const end = order.endTime.seconds
          ? new Date(order.endTime.seconds * 1000)
          : new Date(order.endTime);
        const durationMs = end - start;

        setTotalTime(durationMs);
      }
    }
  }, [order]);

  useEffect(() => {
    if (order && order.slittingData && Array.isArray(order.slittingData)) {
      let sumB = 0;
      let sumC = 0;
      order.slittingData.forEach((item) => {
        const B = parseFloat(item.B) || 0;
        const C = parseFloat(item.C) || 0;
        sumB += B;
        sumC += C;
      });
      setTotalB(sumB);
      setTotalC(sumC);
    }
  }, [order]);

  // Helper function to safely render object or string values
  const safeRender = (value) => {
    if (!value) return "-";
    if (typeof value === "object" && value.label) return value.label;
    if (typeof value === "string") return value;
    return "-";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Not started yet";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return format(date, "dd MMM yyyy, hh:mm a");
  };

  const formatDuration = (durationMs) => {
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));

    return `${hours}h ${minutes}m ${seconds}s`;
  };


  // Updated generateHTMLContent function with modified material usage display

  const generateHTMLContent = () => {
    const slittingRows =
      order.slittingData && order.slittingData.length > 0
        ? order.slittingData
            .map(
              (item) => `
      <tr>
        <td>${item.A || ""}</td>
        <td>${item.B || ""}</td>
        <td>${item.C || ""}</td>
      </tr>`
            )
            .join("")
        : `<tr><td colspan="3">No data available</td></tr>`;

    // ✅ REMOVED: allocatedMaterialsHTML - No longer displayed above the table

    // ✅ UPDATED: Generate material usage table with allocatedQty and materialCategory
    const generateStageUsageTable = (stageName) => {
      if (
        !order.materialUsageTracking ||
        order.materialUsageTracking.length === 0
      ) {
        return "";
      }

      const stageKey = stageName.toLowerCase();
      const isPrintingStage = stageKey === "printing";

      const rows = order.materialUsageTracking
        .map((material) => {
          const stageData = material[stageKey];
          if (!stageData) return "";

          const paperCode = material.paperProductCode || "N/A";
          const paperNo = material.paperProductNo || "N/A";

          // ✅ Only get allocated and category for printing stage
          const allocated = isPrintingStage
            ? material.printing?.allocated || 0
            : null;
          const materialCategory = isPrintingStage
            ? material.printing?.materialCategory || "N/A"
            : null;

          return `
        <tr>
          <td>${paperCode} (${paperNo})</td>
          ${isPrintingStage ? `<td>${allocated}m</td>` : ""}
          ${isPrintingStage ? `<td>${materialCategory}</td>` : ""}
          <td>${stageData.used || 0}</td>
          <td>${stageData.waste || 0}</td>
          <td>${stageData.leftover || 0}</td>
          <td>${stageData.wip || 0}</td>
        </tr>
      `;
        })
        .filter(Boolean)
        .join("");

      if (!rows) return "";

      return `
    <div>
      <div class="usage-title">Material Usage:</div>
      <table class="usage-table">
        <thead>
          <tr>
            <th>Material</th>
            ${isPrintingStage ? "<th>Allocated (m)</th>" : ""}
            ${isPrintingStage ? "<th>Category</th>" : ""}
            <th>Used (m)</th>
            <th>Waste (m)</th>
            <th>Leftover (m)</th>
            <th>WIP (m)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
    };

    const htmlContent = `
  <html>
  <head>
      <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body { 
        font-family: Arial, sans-serif;
        padding: 10px;
      }
      
      h1 { 
        text-align: center; 
        color: #3668B1;
        margin-bottom: 20px;
        font-size: 24px;
        page-break-after: avoid;
      }
      
      .section { 
        border: 2px solid #3668B1; 
        border-radius: 8px; 
        margin-bottom: 15px; 
        padding: 12px 15px 15px 15px;
        page-break-inside: avoid;
      }
      
      .section.punching-section {
        margin-top: 20px;
      }
      
      .section.slitting-section {
        margin-top: 20px;
      }
      
      .section-title { 
        background: #3668B1; 
        color: #fff; 
        font-weight: bold; 
        padding: 6px 14px; 
        border-radius: 5px; 
        display: inline-block; 
        margin-bottom: 12px;
        font-size: 14px !important;
      }
      
      .row { 
        display: flex; 
        flex-wrap: wrap; 
        margin-bottom: 8px; 
      }
      
      .col { 
        flex: 1; 
        min-width: 180px; 
        margin-right: 10px; 
      }
      
      .label { 
        font-weight: bold;
        font-size: 12px !important;
      }
      
      .input { 
        display: inline-block; 
        min-width: 120px;
        font-size: 12px !important;
      }
      
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-top: 8px; 
      }
      
      th, td { 
        border: 1px solid #3668B1; 
        padding: 5px 8px; 
        text-align: center;
        font-size: 11px !important;
      }
      
      .small-table td { 
        min-width: 40px; 
      }
      
      .color-seq-table { 
        margin-bottom: 12px; 
      }
      
      .time-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: nowrap;
      }
      
      .time-row .col {
        flex: 0 0 auto;
        white-space: nowrap;
      }
      
      .time-row .col:last-child {
        margin-left: auto;
      }
    
      /* Material Usage Styles */
      .usage-section {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 2px solid #3668B1;
        page-break-inside: avoid;
      }
      
      .usage-title {
        font-weight: bold;
        margin-bottom: 6px;
        color: #3668B1;
        font-size: 13px;
        page-break-after: avoid;
      }
      
      .usage-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
        page-break-inside: auto;
      }
      
      .usage-table th {
        background: #3668B1;
        color: white;
        padding: 6px 4px;
        font-size: 10px;
        font-weight: bold;
      }
      
      .usage-table td {
        padding: 5px 4px;
        font-size: 9px;
        text-align: center;
        border: 1px solid #3668B1;
      }
      
      .usage-table tbody tr:nth-child(even) {
        background: #f5f8fc;
      }
      
      .usage-table tbody tr:nth-child(odd) {
        background: #ffffff;
      }

      .usage-table thead {
        display: table-header-group;
        page-break-after: avoid;
      }
      
      .usage-table tr {
        page-break-inside: avoid;
      }

      /* Print-specific rules */
      @media print {
        body {
          padding: 5px;
        }
        
        h1 {
          page-break-after: avoid;
        }
        
        .section {
          page-break-inside: avoid;
          margin-bottom: 10px;
        }
        
        .section.punching-section {
          page-break-before: always !important;
        }
        
        .section.allow-break {
          page-break-inside: auto;
        }
        
        .usage-section {
          page-break-before: auto;
          page-break-inside: avoid;
        }
        
        .usage-table thead {
          display: table-header-group;
        }
        
        .usage-table tbody tr {
          page-break-inside: avoid;
        }
        
        .usage-table thead tr,
        .usage-table tbody tr:first-child {
          page-break-after: avoid;
        }
      }

      @page {
        margin: 15mm;
      }
      
      .page-break {
        display: block;
        page-break-before: always;
        page-break-after: always;
        break-before: page;
        break-after: page;
        height: 0;
        margin: 0;
        padding: 0;
        border: none;
      }
    </style>
  </head>
  <body>    
    <h1>Job Card Report</h1>
    
    <div class="section">
      <div class="section-title">Admin</div>
      <div class="row">
            <div class="col"><span class="label">PO No.:</span> <span class="input">${
              order.poNo || ""
            }</span></div>
            <div class="col"><span class="label">Job Date:</span> <span class="input">${jobDateFormatted}</span></div>
      </div>
      <div class="row">
            <div class="col"><span class="label">Customer Name:</span> <span class="input">${
              order.customerName || ""
            }</span></div>
              <div class="col"><span class="label">Label Type:</span> <span class="input">${
                order.jobType || ""
              }</span></div>
      </div>
      <div class="row">
            <div class="col"><span class="label">Job Card no:</span> <span class="input">${
              order.jobCardNo || ""
            }</span></div>
            <div class="col"><span class="label">Job Name:</span> <span class="input">${
              order.jobName || ""
            }</span></div>
      </div>
      <div class="row">
          <div class="col"><span class="label">Job Original Size:</span> <span class="input">${
            order.jobSize || ""
          }</span></div>
          <div class="col"><span class="label">Job Qty:</span> <span class="input">${
            order.jobQty || ""
          }</span></div>
      </div>        
      <div class="row">
          <div class="col"><span class="label">Job Creation Time:</span> <span class="input">${jobCreationTime}</span></div>  
          <div class="col"><span class="label">Teeth Size:</span> <span class="input">${safeRender(
            order.teethSize
          )}</span></div>           
      </div>          
        <div class="row time-row">
        <div class="col"><span class="label">Start time:</span> <span class="input">${startTimeFormatted}</span></div>
        <div class="col"><span class="label">End time:</span> <span class="input">${endTimeFormatted}</span></div>
        <div class="col"><span class="label">Total time:</span> <span class="input">${totalTimeFormatted}</span></div>
      </div>
    </div>

    <div id="printing-section" class="section allow-break">
      <div class="section-title">Printing</div>
      <div class="row">
        <div class="col"><span class="label">Printing Start Time:</span> <span class="input">${
          order.jobType === "Plain" ? "" : printingStartTimeFormatted || ""
        }</span></div>
        <div class="col"><span class="label">Printing End Time:</span> <span class="input">${
          printingEndTimeFormatted || ""
        }</span></div>
      </div>
      <div class="row"><span class="label">Color Seq.</span></div>
      
      <table class="small-table color-seq-table">
          <tr>
            <td>C : ${order.colorAniloxValues?.C?.value || ""}</td>
            <td>M : ${order.colorAniloxValues?.M?.value || ""}</td>
            <td>Y : ${order.colorAniloxValues?.Y?.value || ""}</td>
            <td>K : ${order.colorAniloxValues?.K?.value || ""}</td>
          </tr>
          <tr>
            <td>Sp1 : ${order.colorAniloxValues?.Sq1?.value || ""}</td>
            <td>Sp2 : ${order.colorAniloxValues?.Sq2?.value || ""}</td>    
            <td>Sp3 : ${order.colorAniloxValues?.Sq3?.value || ""}</td>
            <td>Sp4 : ${order.colorAniloxValues?.Sq4?.value || ""}</td>
          </tr>
        </table>

      <div class="row">
             <div class="col">
            <span class="label">Printing Colors:</span>
            <span class="input">
              ${
                order.printingColors && order.printingColors.length > 0
                  ? order.printingColors.join(", ")
                  : ""
              }
            </span>
          </div>
            <div class="col"><span class="label">Tooling:</span> <span class="input">${
              order.tooling || ""
            }</span></div>
      </div>   

     ${generateStageUsageTable("printing")}
    </div>

    <div class="page-break"></div>
    
    <div id="punching-section" class="section allow-break punching-section">
      <div class="section-title">Punching</div>
      <div class="row">
        <div class="col"><span class="label">Punching Start Time:</span> <span class="input">${
          punchingStartTimeFormatted || ""
        }</span></div>
        <div class="col"><span class="label">Punching End Time:</span> <span class="input">${
          punchingEndTimeFormatted || ""
        }</span></div>
      </div>
      <div class="row">
        <div class="col"><span class="label">Paper Code:</span> <span class="input">${
          order.paperCode || ""
        }</span></div>
        <div class="col"><span class="label">Running Mtrs:</span> <span class="input">
        </span></div>
      </div>

      ${generateStageUsageTable("punching")}
    </div>

    <div id="slitting-section" class="section allow-break slitting-section">
      <div class="section-title">Slitting</div>
      <div class="row">
        <div class="col"><span class="label">Slitting Start Time:</span> <span class="input">${
          slittingStartTimeFormatted || ""
        }</span></div>
        <div class="col"><span class="label">Slitting End Time:</span> <span class="input">${
          slittingEndTimeFormatted || ""
        }</span></div>
      </div>
      <div class="subsection">
        <table border="1">
          <thead>
            <tr>
              <th>Labels</th>
              <th>No of Rolls</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${slittingRows}
          </tbody>
        </table>
      </div>

      ${generateStageUsageTable("slitting")}
    </div>
  </body>
  </html>
`;

    return htmlContent;
  };
  //   const captureSection = async (element, pdf) => {
  //   const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  //   const imgData = canvas.toDataURL("image/png");

  //   const pdfWidth = pdf.internal.pageSize.getWidth();
  //   const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  //   pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  // };

  const generatePDF = async () => {
    try {
      const htmlContent = generateHTMLContent();

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      const rawJobCardNo = order.jobCardNo || "Unknown";
      const safeJobCardNo = rawJobCardNo
        .toString()
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 20);

      const fileName = `Job_Details_${safeJobCardNo}.pdf`;
      const blob = pdf.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "Job Details PDF",
            text: `Job details for ${order.jobCardNo}`,
          });
          console.log("PDF shared successfully");
          return;
        } catch (err) {
          console.warn("Share cancelled", err);
        }
      }

      console.log("Share not supported — using fallback options.");
      setShowShareOptions(true);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF");
    }
  };

  const savePDF = async () => {
    try {
      const htmlContent = generateHTMLContent();

      // Create container
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Wait for content to render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Helper function to capture and add a section to PDF
      const captureSection = async (element, addNewPage = false) => {
        if (!element) {
          console.warn("Element not found for capture");
          return;
        }

        if (addNewPage) {
          pdf.addPage();
        }

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // If content is taller than one page, split it across multiple pages
        if (imgHeight > pdfHeight) {
          let position = 0;
          let heightLeft = imgHeight;

          while (heightLeft > 0) {
            if (position > 0) {
              pdf.addPage();
            }
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            position -= pdfHeight;
            heightLeft -= pdfHeight;
          }
        } else {
          pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        }
      };

      // Get all sections
      const h1Element = container.querySelector("h1");
      const adminSection = container.querySelector(".section");
      const printingSection = container.querySelector("#printing-section");
      const punchingSection = container.querySelector("#punching-section");
      const slittingSection = container.querySelector("#slitting-section");

      // Check if required elements exist
      if (!h1Element || !adminSection || !printingSection) {
        throw new Error("Required sections not found in HTML");
      }

      // PAGE 1: Title + Admin + Printing
      const page1Container = document.createElement("div");
      page1Container.appendChild(h1Element.cloneNode(true));
      page1Container.appendChild(adminSection.cloneNode(true));
      page1Container.appendChild(printingSection.cloneNode(true));

      // Temporarily add to container for rendering
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.innerHTML = page1Container.innerHTML;
      document.body.appendChild(tempDiv);

      await captureSection(tempDiv, false);
      document.body.removeChild(tempDiv);

      // PAGE 2: Punching (FORCED NEW PAGE)
      if (punchingSection) {
        // Add spacing div before punching
        const spacerDiv = document.createElement("div");
        spacerDiv.style.height = "20px";

        const page2Container = document.createElement("div");
        page2Container.appendChild(spacerDiv);
        page2Container.appendChild(punchingSection.cloneNode(true));

        const tempDiv2 = document.createElement("div");
        tempDiv2.style.position = "absolute";
        tempDiv2.style.left = "-9999px";
        tempDiv2.innerHTML = page2Container.innerHTML;
        document.body.appendChild(tempDiv2);

        await captureSection(tempDiv2, true);
        document.body.removeChild(tempDiv2);
      }

      // Check if Slitting fits on same page or needs new page
      if (punchingSection && slittingSection) {
        // We need to capture the full page 2 content (spacer + punching)
        const spacerDiv = document.createElement("div");
        spacerDiv.style.height = "20px";

        const page2Container = document.createElement("div");
        page2Container.appendChild(spacerDiv.cloneNode(true));
        page2Container.appendChild(punchingSection.cloneNode(true));

        const tempPage2 = document.createElement("div");
        tempPage2.style.position = "absolute";
        tempPage2.style.left = "-9999px";
        tempPage2.innerHTML = page2Container.innerHTML;
        document.body.appendChild(tempPage2);

        const page2Canvas = await html2canvas(tempPage2, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const page2Height = (page2Canvas.height * pdfWidth) / page2Canvas.width;
        document.body.removeChild(tempPage2);

        const slittingCanvas = await html2canvas(slittingSection, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const slittingHeight =
          (slittingCanvas.height * pdfWidth) / slittingCanvas.width;

        // Add 7mm spacing between sections
        const spacingMM = 7;

        // If both sections fit on one page together (with spacing)
        if (page2Height + slittingHeight + spacingMM <= pdfHeight) {
          const slittingImgData = slittingCanvas.toDataURL("image/png");
          pdf.addImage(
            slittingImgData,
            "PNG",
            0,
            page2Height + spacingMM,
            pdfWidth,
            slittingHeight
          );
        } else {
          // Otherwise, Slitting goes on a new page
          await captureSection(slittingSection, true);
        }
      } else if (slittingSection) {
        // If no punching section, add slitting on new page
        await captureSection(slittingSection, true);
      }

      // Clean up
      document.body.removeChild(container);

      // Generate filename
      const now = new Date();
      const shortStamp = `${now.getHours()}${now.getMinutes()}`;
      const cleanCustomerName = (order.customerName || "Customer")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 10);
      const cleanJobName = (order.jobName || "Job")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 12);
      const cleanJobCardNo = (order.jobCardNo || "0000")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 8);

      const fileName = `JobDetails_${cleanCustomerName}_${cleanJobName}_${cleanJobCardNo}_${shortStamp}.pdf`;

      pdf.save(fileName);
      alert(`PDF saved to Downloads:\n${fileName}`);
      console.log("✅ PDF saved:", fileName);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate or save PDF: " + error.message);
    }
  };
  if (loading)
    return <div className="p-10 text-center text-lg">Loading...</div>;
  if (!order)
    return <div className="p-10 text-center text-lg">Order not found</div>;

  const jobCreationTime = order.createdAt
    ? formatTimestamp(order.createdAt)
    : "";
  const startTimeFormatted = order.updatedAt
    ? formatTimestamp(order.updatedAt)
    : order.updatedByPunchingAt
    ? formatTimestamp(order.updatedByPunchingAt)
    : "Not started yet";
  const endTimeFormatted = order.endTime
    ? formatTimestamp(order.endTime)
    : "Not finished yet";
  const totalTimeFormatted =
    totalTime !== null ? formatDuration(totalTime) : "Calculating...";
  const jobDateFormatted = order.jobDate
    ? format(
        order.jobDate.seconds
          ? new Date(order.jobDate.seconds * 1000)
          : new Date(order.jobDate),
        "dd/MM/yyyy"
      )
    : "";

  const printingStartTimeFormatted = order.updatedAt
    ? formatTimestamp(order.updatedAt)
    : "";
  const printingEndTimeFormatted = order.updatedByPrintingAt
    ? formatTimestamp(order.updatedByPrintingAt)
    : "";
  const punchingStartTimeFormatted = order.punchingStartAt
    ? formatTimestamp(order.punchingStartAt)
    : "";
  const punchingEndTimeFormatted = order.updatedByPunchingAt
    ? formatTimestamp(order.updatedByPunchingAt)
    : "";
  const slittingStartTimeFormatted = order.startBySlittingAt
    ? formatTimestamp(order.startBySlittingAt)
    : "";
  const slittingEndTimeFormatted = order.updatedBySlittingAt
    ? formatTimestamp(order.updatedBySlittingAt)
    : "";

  return (
    <div className="min-h-screen space-y-5 max-w-screen">
      <div className="flex justify-between items-baseline">
        <h1>Job Details</h1>
        <BackButton />
      </div>
      <hr />
      <div className="rounded-2xl mx-auto bg-gray-100 py-16 px-5">
        {/* Simple View for Screen Display */}
        <div className="bg-white shadow-md rounded-xl p-6 mb-6 max-w-5xl mx-auto">
          <div className="space-y-4">
            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Card No</p>
              <p className="text-lg font-medium">{order.jobCardNo || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Name</p>
              <p className="text-lg font-medium">{order.jobName || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Qty</p>
              <p className="text-lg font-medium">{order.jobQty || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Customer Name</p>
              <p className="text-lg font-medium">{order.customerName || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Date</p>
              <p className="text-lg font-medium">{jobDateFormatted || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Status</p>
              <p className="text-lg font-medium">{order.jobStatus || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Start Time</p>
              <p className="text-lg font-medium">{startTimeFormatted}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">End Time</p>
              <p className="text-lg font-medium">{endTimeFormatted}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Total Time</p>
              <p className="text-lg font-medium">{totalTimeFormatted}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Running Mtrs</p>
              <p className="text-lg font-medium">{order.runningMtr || "N/A"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Paper</p>
              <p className="text-lg font-medium">
                {safeRender(order.jobPaper)}
              </p>
            </div>

            {order.jobType !== "Printing" && (
              <div className="border-b pb-3">
                <p className="text-gray-500 text-sm">Paper Code</p>
                <p className="text-lg font-medium">{order.paperCode || "-"}</p>
              </div>
            )}

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Job Size</p>
              <p className="text-lg font-medium">{order.jobSize || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Printing Plate Size</p>
              <p className="text-lg font-medium">
                {safeRender(order.printingPlateSize)}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Across Ups</p>
              <p className="text-lg font-medium">
                {safeRender(order.upsAcross)}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Across Gap</p>
              <p className="text-lg font-medium">{order.acrossGap || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Around</p>
              <p className="text-lg font-medium">{safeRender(order.around)}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Around Gap</p>
              <p className="text-lg font-medium">{order.aroundGap || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Teeth Size</p>
              <p className="text-lg font-medium">
                {safeRender(order.teethSize)}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Blocks</p>
              <p className="text-lg font-medium">{safeRender(order.blocks)}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Winding Direction</p>
              <p className="text-lg font-medium">
                {safeRender(order.windingDirection)}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Tooling</p>
              <p className="text-lg font-medium">{order.tooling || "-"}</p>
            </div>

            {/* Allocated Materials Section */}
            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm font-semibold mb-3">
                Allocated Materials
              </p>
              {allocatedMaterials.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No materials allocated yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {allocatedMaterials.map((material, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            Paper Product Code
                          </p>
                          <p className="text-sm font-medium">
                            {safeRender(material.code)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Paper Product No
                          </p>
                          <p className="text-sm font-medium">
                            {material.number || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Allocated Qty</p>
                          <p className="text-sm font-medium">
                            {material.allocatedQty}m
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <p className="text-sm font-medium">
                            {material.materialCategory}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm font-semibold">
                Slitting Data
              </p>
              {order.slittingData && order.slittingData.length > 0 ? (
                <>
                  <table className="w-full mt-2 border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2">Labels</th>
                        <th className="border border-gray-300 p-2">
                          No of Rolls
                        </th>
                        <th className="border border-gray-300 p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.slittingData.map((item, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 p-2 text-center">
                            {item.A}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {item.B}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            {item.C}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between bg-[#3668B1] text-white p-2 rounded mt-3">
                    <span className="font-semibold">Total Rolls:</span>
                    <span className="font-semibold">{totalB}</span>
                  </div>
                  <div className="flex justify-between bg-[#3668B1] text-white p-2 rounded mt-2">
                    <span className="font-semibold">Final Total:</span>
                    <span className="font-semibold">{totalC}</span>
                  </div>
                </>
              ) : (
                <p className="text-lg">No slitting data available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-6 flex-wrap">
          <button
            onClick={generatePDF}
            className="bg-gradient-to-t from-green-800 to-green-600 text-white py-3 hover:scale-95 duration-300 transition-transform px-8 rounded-lg font-semibold"
          >
            Share PDF
          </button>

          {showShareOptions && (
            <div className="flex gap-4">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  const text = `Job Details PDF for ${order.jobCardNo}`;
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(text)}`,
                    "_blank"
                  );
                }}
              >
                Share on WhatsApp
              </button>

              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  const subject = "Job Details PDF";
                  const body = `Hi, please find the Job Details for ${order.jobCardNo}.`;
                  window.location.href = `mailto:?subject=${encodeURIComponent(
                    subject
                  )}&body=${encodeURIComponent(body)}`;
                }}
              >
                Share on Email
              </button>
            </div>
          )}

          <button
            onClick={savePDF}
            className="bg-gradient-to-t from-[#102F5C] to-[#3566AD] hover:scale-95 text-white py-3 px-8 rounded-lg font-semibold transition"
          >
            Download PDF
          </button>

          <Link to="/jobcard">
            <button className="bg-gradient-to-t from-black/20 to-white hover:scale-95 text-primary py-3 px-8 rounded-lg font-semibold transition">
              Back
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsScreen;
