import React from "react";
import ReactDOMServer from "react-dom/server";
import FairMarketValuePrintable from "../components/FairMarketValuePrintable";

export function openPrintWindow(data: any) {
  // Map data to the props expected by FairMarketValuePrintable
  const printContent = ReactDOMServer.renderToString(
    React.createElement(FairMarketValuePrintable, {
      compareType: data.compareType ?? 'TCC',
      specialty: data.specialty,
      providerType: data.providerType,
      region: data.region,
      year: String(data.year),
      value: data.value ?? data.totalTcc ?? 0,
      marketPercentile: data.percentile,
      marketData: {
        p25: data.percentiles[25] ?? 0,
        p50: data.percentiles[50] ?? 0,
        p75: data.percentiles[75] ?? 0,
        p90: data.percentiles[90] ?? 0,
      },
    })
  );
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Fair Market Value Report</title>
        <link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700&display=swap" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/@fontsource/roboto@latest/400.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/@fontsource/roboto@latest/500.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/@fontsource/roboto@latest/700.css" rel="stylesheet">
        <style>
          body { background: white !important; font-family: 'Roboto', Arial, sans-serif; }
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
} 