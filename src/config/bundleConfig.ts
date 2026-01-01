/**
 * Bundle Configuration for Dynamic Imports
 * Centralized configuration for lazy loading heavy dependencies
 */

/**
 * Dynamically import Chart.js and its components
 * Only loads when charts are actually needed
 */
export const loadChartJS = async () => {
  const [
    { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title },
    { Bar },
    { Line }
  ] = await Promise.all([
    import('chart.js'),
    import('react-chartjs-2'),
    import('react-chartjs-2')
  ]);

  Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title);

  return { Chart, Bar, Line, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Title };
};

/**
 * Dynamically import ECharts
 * Only loads when ECharts components are needed
 */
export const loadECharts = async () => {
  const ReactECharts = await import('echarts-for-react');
  return ReactECharts.default;
};

/**
 * Dynamically import XLSX for Excel export
 * Only loads when export functionality is triggered
 */
export const loadXLSX = async () => {
  return await import('xlsx');
};

/**
 * Dynamically import jsPDF for PDF generation
 * Only loads when PDF export is triggered
 */
export const loadJSPDF = async () => {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas')
  ]);
  const html2canvas = html2canvasModule.default || html2canvasModule;
  return { jsPDF, html2canvas };
};

