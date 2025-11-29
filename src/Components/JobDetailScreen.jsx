import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// import { ht } from "date-fns/locale";

const AdminJobDetailsScreen = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalTime, setTotalTime] = useState(null);
  const [totalB, setTotalB] = useState(0);
  const [totalC, setTotalC] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "ordersTest", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
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

  const getExtraPaperProducts = () => {
    if (!order) return [];
    let products = [];

    Object.keys(order).forEach((key) => {
      const match = key.match(/^paperProductCode(\d+)$/);
      if (match) {
        const index = match[1];
        products.push({
          code: order[`paperProductCode${index}`],
          number: order[`paperProductNo${index}`] || "",
          index,
        });
      }
    });

    return products;
  };

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

    const extraPaperProductsHTML = getExtraPaperProducts()
      .map(
        (item, i) => `
        <div class="row">
          <div class="col">
            <span class="label">Paper Product Code ${i + 1}:</span>
            <span class="input">${item.code?.label || item.code || ""}</span>
          </div>
          <div class="col">
            <span class="label">Paper Product No ${i + 1}:</span>
            <span class="input">${item.number || ""}</span>
          </div>
        </div>
      `
      )
      .join("");

    const htmlContent = `
      <html>
      <head>
          <style>
          body { font-family: Arial, sans-serif; }
          h1 { text-align: center; color: #3668B1; }
          .section { border: 2px solid #3668B1; border-radius: 8px; margin-bottom: 18px; padding: 10px 15px; }
          .section-title { background: #3668B1; color: #fff; font-weight: bold; padding: 3px 10px; border-radius: 5px; display: inline-block; margin-bottom: 10px; }
          .row { display: flex; flex-wrap: wrap; margin-bottom: 8px; }
          .col { flex: 1; min-width: 180px; margin-right: 10px; }
          .label { font-weight: bold; }
          .input { display: inline-block; min-width: 120px; } /* 🧹 removed underline */
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #3668B1; padding: 4px 8px; text-align: center; }
          .small-table td { min-width: 40px; }
          .color-seq-table { margin-bottom: 15px; }
          .time-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              flex-wrap: nowrap;
            }
            .time-row .col {
              flex: 0 0 auto;  /* Prevent wrapping */
              white-space: nowrap;
            }
            .time-row .col:last-child {
              margin-left: auto; /* Push total time to right */
            }
        </style>

      </head>
      <body>    

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
              <div class="col"><span class="label">Teeth Size:</span> <span class="input">${
                order.teethSize.label || order.teethSize || ""
              }</span></div>           
          </div>          
            <div class="row time-row">
            <div class="col"><span class="label">Start time:</span> <span class="input">${startTimeFormatted}</span></div>
            <div class="col"><span class="label">End time:</span> <span class="input">${endTimeFormatted}</span></div>
            <div class="col"><span class="label">Total time:</span> <span class="input">${totalTimeFormatted}</span></div>
          </div>

        </div>

        <div class="section">
          <div class="section-title">Printing</div>
          <div class="row">
            <div class="col"><span class="label">Printing Start Time:</span> <span class="input">${
              printingStartTimeFormatted || ""
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
                <div class="col"><span class="label">Running Mtrs:</span> <span class="input">${
                  order.runningMtr || ""
                }</span></div>
                <div class="col"><span class="label">Tooling:</span> <span class="input">${
                  order.tooling || ""
                }</span></div>
          </div>

            <div class="row">
                    <div class="col"><span class="label">Paper Product Code:</span> <span class="input">${
                      order.paperProductCode?.label ||
                      order.paperProductCode ||
                      ""
                    }</span></div>
                    <div class="col"><span class="label">Paper Product No:</span> <span class="input">${
                      order.paperProductNo || ""
                    }</span>
                    </div>
          </div>
          ${extraPaperProductsHTML}

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
         </div>
        </div>

        <div class="section">
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
            <div class="col"><span class="label">Running Mtrs:</span> <span class="input">${
              order.runningMtr || ""
            }</span></div>
          </div>
        </div>

        <div class="section">
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
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  // Share PDF function - opens share dialog or downloads
  // const generatePDF = async () => {
  //   try {
  //     const htmlContent = generateHTMLContent();

  //     // Create a temporary container
  //     const container = document.createElement("div");
  //     container.style.position = "absolute";
  //     container.style.left = "-9999px";
  //     container.innerHTML = htmlContent;
  //     document.body.appendChild(container);

  //     const canvas = await html2canvas(container, {
  //       scale: 2,
  //       useCORS: true,
  //       logging: false,
  //     });

  //     document.body.removeChild(container);

  //     const imgData = canvas.toDataURL("image/png");
  //     const pdf = new jsPDF("p", "mm", "a4");
  //     const pdfWidth = pdf.internal.pageSize.getWidth();
  //     const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  //     let heightLeft = pdfHeight;
  //     let position = 0;

  //     pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  //     heightLeft -= pdf.internal.pageSize.getHeight();

  //     while (heightLeft >= 0) {
  //       position = heightLeft - pdfHeight;
  //       pdf.addPage();
  //       pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  //       heightLeft -= pdf.internal.pageSize.getHeight();
  //     }

  //     const rawJobCardNo = order.jobCardNo || "Unknown";
  //     const safeJobCardNo = rawJobCardNo
  //       .toString()
  //       .replace(/[^a-zA-Z0-9_-]/g, "")
  //       .slice(0, 20);

  //     const fileName = `Job_Details_${safeJobCardNo}.pdf`;

  //     // Try to use Web Share API if available
  //     if (navigator.share && navigator.canShare) {
  //       const blob = pdf.output("blob");
  //       const file = new File([blob], fileName, { type: "application/pdf" });

  //       if (navigator.canShare({ files: [file] })) {
  //         await navigator.share({
  //           files: [file],
  //           title: "Job Details PDF",
  //           text: `Job details for ${order.jobCardNo}`,
  //         });
  //         console.log("PDF shared successfully");
  //         return;
  //       }
  //     }

  //     // Fallback: Download the PDF
  //     pdf.save(fileName);
  //     alert("PDF downloaded successfully!");
  //   } catch (error) {
  //     console.error("PDF generation error:", error);
  //     alert("Failed to generate PDF");
  //   }
  // };

  const generatePDF = async () => {
    try {
      const htmlContent = generateHTMLContent();

      // Create hidden render container
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

      // ⭐ Try Web Share API
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

      // ⭐ Fallback (NO DOWNLOAD)
      console.log("Share not supported — using fallback options.");
      setShowShareOptions(true); // <- show WhatsApp / Email buttons instead
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF");
    }
  };

  // Save/Download PDF function
  const savePDF = async () => {
    try {
      const htmlContent = generateHTMLContent();

      // Create a temporary container
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

      // Generate filename with timestamp
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
      alert("Failed to generate or save PDF");
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
    <div className="min-h-screen bg-gray-100 py-10 px-5">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#3668B1]">
          Job Details
        </h1>

        {/* Simple View for Screen Display */}
        <div className="bg-white shadow-md rounded-xl p-6 mb-6">
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
                {order.jobPaper?.label || order.jobPaper || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Paper Product Code</p>
              <p className="text-lg font-medium">
                {order.paperProductCode?.label || order.paperProductCode || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Paper Product No</p>
              <p className="text-lg font-medium">
                {order.paperProductNo || "-"}
              </p>
            </div>

            {getExtraPaperProducts().map((item, index) => (
              <div key={index}>
                <div className="border-b pb-3">
                  <p className="text-gray-500 text-sm">
                    Paper Product Code {item.index}
                  </p>
                  <p className="text-lg font-medium">
                    {item.code?.label || item.code || "-"}
                  </p>
                </div>
                <div className="border-b pb-3">
                  <p className="text-gray-500 text-sm">
                    Paper Product No {item.index}
                  </p>
                  <p className="text-lg font-medium">{item.number || "-"}</p>
                </div>
              </div>
            ))}

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
                {order.printingPlateSize?.label ||
                  order.printingPlateSize ||
                  "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Across Ups</p>
              <p className="text-lg font-medium">
                {order.upsAcross?.label || order.upsAcross || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Across Gap</p>
              <p className="text-lg font-medium">{order.acrossGap || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Around</p>
              <p className="text-lg font-medium">
                {order.around?.label || order.around || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Around Gap</p>
              <p className="text-lg font-medium">{order.aroundGap || "-"}</p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Teeth Size</p>
              <p className="text-lg font-medium">
                {order.teethSize?.label || order.teethSize || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Blocks</p>
              <p className="text-lg font-medium">
                {order.blocks?.label || order.blocks || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Winding Direction</p>
              <p className="text-lg font-medium">
                {order.windingDirection?.label || order.windingDirection || "-"}
              </p>
            </div>

            <div className="border-b pb-3">
              <p className="text-gray-500 text-sm">Tooling</p>
              <p className="text-lg font-medium">{order.tooling || "-"}</p>
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

        {/* Hidden PDF Content - Formatted Sections */}
        <div
          id="pdf-content"
          className="hidden bg-white shadow-lg rounded-lg p-8"
        >
          {/* Admin Section */}
          <div className="mb-6 border-2 border-[#3668B1] rounded-lg p-5">
            <div className="bg-[#3668B1] text-white font-bold py-1 px-3 rounded inline-block mb-4">
              Admin
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">PO No.:</span>{" "}
                {order.poNo || ""}
              </div>
              <div>
                <span className="font-semibold">Job Date:</span>{" "}
                {jobDateFormatted}
              </div>
              <div>
                <span className="font-semibold">Customer Name:</span>{" "}
                {order.customerName || ""}
              </div>
              <div>
                <span className="font-semibold">Label Type:</span>{" "}
                {order.jobType || ""}
              </div>
              <div>
                <span className="font-semibold">Job Card No:</span>{" "}
                {order.jobCardNo || ""}
              </div>
              <div>
                <span className="font-semibold">Job Name:</span>{" "}
                {order.jobName || ""}
              </div>
              <div>
                <span className="font-semibold">Job Original Size:</span>{" "}
                {order.jobSize || ""}
              </div>
              <div>
                <span className="font-semibold">Job Qty:</span>{" "}
                {order.jobQty || ""}
              </div>
              <div>
                <span className="font-semibold">Job Creation Time:</span>{" "}
                {jobCreationTime}
              </div>
              <div>
                <span className="font-semibold">Teeth Size:</span>{" "}
                {order.teethSize?.label || order.teethSize || ""}
              </div>
              <div>
                <span className="font-semibold">Start time:</span>{" "}
                {startTimeFormatted}
              </div>
              <div>
                <span className="font-semibold">End time:</span>{" "}
                {endTimeFormatted}
              </div>
              <div className="md:col-span-2">
                <span className="font-semibold">Total time:</span>{" "}
                {totalTimeFormatted}
              </div>
            </div>
          </div>

          {/* Printing Section */}
          <div className="mb-6 border-2 border-[#3668B1] rounded-lg p-5">
            <div className="bg-[#3668B1] text-white font-bold py-1 px-3 rounded inline-block mb-4">
              Printing
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-semibold">Printing Start Time:</span>{" "}
                {printingStartTimeFormatted || ""}
              </div>
              <div>
                <span className="font-semibold">Printing End Time:</span>{" "}
                {printingEndTimeFormatted || ""}
              </div>
            </div>

            <div className="mb-4">
              <span className="font-semibold">Color Seq.</span>
            </div>
            <table className="w-full border-collapse mb-4">
              <tbody>
                <tr>
                  <td className="border border-[#3668B1] p-2 text-center">
                    C: {order.colorAniloxValues?.C?.value || ""}
                  </td>
                  <td className="border border-[#3668B1] p-2 text-center">
                    M: {order.colorAniloxValues?.M?.value || ""}
                  </td>
                  <td className="border border-[#3668B1] p-2 text-center">
                    Y: {order.colorAniloxValues?.Y?.value || ""}
                  </td>
                  <td className="border border-[#3668B1] p-2 text-center">
                    K: {order.colorAniloxValues?.K?.value || ""}
                  </td>
                </tr>
                <tr>
                  <td className="border border-[#3668B1] p-2 text-center">
                    Sp1: {order.colorAniloxValues?.Sq1?.value || ""}
                  </td>
                  <td className="border border-[#3668B1] p-2 text-center">
                    Sp2: {order.colorAniloxValues?.Sq2?.value || ""}
                  </td>
                  <td className="border border-[#3668B1] p-2 text-center">
                    Sp3: {order.colorAniloxValues?.Sq3?.value || ""}
                  </td>
                  <td className="border border-[#3668B1] p-2 text-center">
                    Sp4: {order.colorAniloxValues?.Sq4?.value || ""}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Running Mtrs:</span>{" "}
                {order.runningMtr || ""}
              </div>
              <div>
                <span className="font-semibold">Tooling:</span>{" "}
                {order.tooling || ""}
              </div>
              <div>
                <span className="font-semibold">Paper Product Code:</span>{" "}
                {order.paperProductCode?.label || order.paperProductCode || ""}
              </div>
              <div>
                <span className="font-semibold">Paper Product No:</span>{" "}
                {order.paperProductNo || ""}
              </div>
            </div>

            {getExtraPaperProducts().map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
              >
                <div>
                  <span className="font-semibold">
                    Paper Product Code {i + 1}:
                  </span>{" "}
                  {item.code?.label || item.code || ""}
                </div>
                <div>
                  <span className="font-semibold">
                    Paper Product No {i + 1}:
                  </span>{" "}
                  {item.number || ""}
                </div>
              </div>
            ))}

            <div className="mt-4">
              <span className="font-semibold">Printing Colors:</span>{" "}
              {order.printingColors && order.printingColors.length > 0
                ? order.printingColors.join(", ")
                : ""}
            </div>
          </div>

          {/* Punching Section */}
          <div className="mb-6 border-2 border-[#3668B1] rounded-lg p-5">
            <div className="bg-[#3668B1] text-white font-bold py-1 px-3 rounded inline-block mb-4">
              Punching
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Punching Start Time:</span>{" "}
                {punchingStartTimeFormatted || ""}
              </div>
              <div>
                <span className="font-semibold">Punching End Time:</span>{" "}
                {punchingEndTimeFormatted || ""}
              </div>
              <div>
                <span className="font-semibold">Paper Code:</span>{" "}
                {order.paperCode || ""}
              </div>
              <div>
                <span className="font-semibold">Running Mtrs:</span>{" "}
                {order.runningMtr || ""}
              </div>
            </div>
          </div>

          {/* Slitting Section */}
          <div className="mb-6 border-2 border-[#3668B1] rounded-lg p-5">
            <div className="bg-[#3668B1] text-white font-bold py-1 px-3 rounded inline-block mb-4">
              Slitting
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="font-semibold">Slitting Start Time:</span>{" "}
                {slittingStartTimeFormatted || ""}
              </div>
              <div>
                <span className="font-semibold">Slitting End Time:</span>{" "}
                {slittingEndTimeFormatted || ""}
              </div>
            </div>

            {order.slittingData && order.slittingData.length > 0 ? (
              <>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-[#3668B1] p-2">Labels</th>
                      <th className="border border-[#3668B1] p-2">
                        No of Rolls
                      </th>
                      <th className="border border-[#3668B1] p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.slittingData.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-[#3668B1] p-2 text-center">
                          {item.A || ""}
                        </td>
                        <td className="border border-[#3668B1] p-2 text-center">
                          {item.B || ""}
                        </td>
                        <td className="border border-[#3668B1] p-2 text-center">
                          {item.C || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-4 flex justify-between bg-[#3668B1] text-white p-3 rounded">
                  <span className="font-semibold">Total Rolls:</span>
                  <span className="font-semibold">{totalB}</span>
                </div>
                <div className="mt-2 flex justify-between bg-[#3668B1] text-white p-3 rounded">
                  <span className="font-semibold">Final Total:</span>
                  <span className="font-semibold">{totalC}</span>
                </div>
              </>
            ) : (
              <p>No slitting data available.</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={generatePDF}
            className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg font-semibold transition"
          >
            Share PDF
          </button>
          {showShareOptions && (
            <div className="flex gap-4 mt-4">
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
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-lg font-semibold transition"
          >
            Download PDF
          </button>

          <Link to="/jobcard">
            <button className="bg-[#3668B1] hover:bg-[#2a5296] text-white py-3 px-8 rounded-lg font-semibold transition">
              Back
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminJobDetailsScreen;
