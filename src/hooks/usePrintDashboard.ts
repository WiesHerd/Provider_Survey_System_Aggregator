import { useCallback } from 'react';

interface HiddenElement {
  element: HTMLElement;
  display: string;
}

export const usePrintDashboard = () => {
  const handlePrint = useCallback(() => {
    // Hide all other elements
    const rootElement = document.documentElement;
    const originalOverflow = rootElement.style.overflow;
    const elements = document.body.children;
    const hiddenElements: HiddenElement[] = [];

    Array.from(elements).forEach((element) => {
      if (element instanceof HTMLElement && !element.classList.contains('print-dashboard')) {
        hiddenElements.push({
          element,
          display: element.style.display,
        });
        element.style.display = 'none';
      }
    });

    // Force background colors and images in print
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Print the dashboard
    window.print();

    // Restore the original state
    hiddenElements.forEach(({ element, display }) => {
      element.style.display = display;
    });
    rootElement.style.overflow = originalOverflow;
    document.head.removeChild(style);
  }, []);

  return { handlePrint };
};

export default usePrintDashboard; 