import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBill } from '../service/api';
import { useConfig } from '../context/ConfigContext';
import { toast } from 'react-hot-toast';
import ThermalReceipt from '../components/ThermalReceipt';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentSuccessPage() {
  const q = useQuery();
  const orderId = q.get('orderId');
  const txnid = q.get('txnid');
  const { config: shopConfig } = useConfig();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadBill();
    }
  }, [orderId]);

  const loadBill = async () => {
    try {
      const res = await getBill(orderId);
      setBillData(res.data);
      // Auto-print on load if needed, or just let user click
      // setTimeout(() => window.print(), 1000); 
    } catch (err) {
      console.error("Failed to load bill", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? convert(n % 100000) : '');
      return '';
    };
    const whole = Math.floor(num);
    return convert(whole) + 'Rupees Only';
  };

  const getBillPDFFile = () => {
    if (!billData) return null;
    const doc = new jsPDF({ format: [80, 230], unit: 'mm' });
    const pw = 80;
    let y = 5;

    // 1. Header Section
    if (shopConfig.logo) {
      try { doc.addImage(shopConfig.logo, 'PNG', pw / 2 - 12, y, 24, 24); y += 32; } catch (e) { y += 5; }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(shopConfig.name.toUpperCase(), pw / 2, y, { align: 'center' });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    shopConfig.address.forEach(line => {
      doc.text(line.toUpperCase(), pw / 2, y, { align: 'center' });
      y += 3.5;
    });
    if (shopConfig.fssai) {
      doc.text(`FSSAI: ${shopConfig.fssai}`, pw / 2, y, { align: 'center' });
      y += 5;
    }

    doc.setLineWidth(0.3);
    doc.line(5, y, 75, y);
    y += 5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(shopConfig.gstEnabled ? "TAX INVOICE" : "INVOICE", pw / 2, y, { align: 'center' });
    y += 2;
    doc.setLineWidth(0.1);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y + 2, 75, y + 2);
    y += 6;

    // 2. Meta Information
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(`Bill No: ${billData.orderId}`, 5, y);
    doc.text(`Counter: 01`, 75, y, { align: 'right' });
    y += 5;
    doc.setFont("helvetica", "normal");
    const [datePart, timePart] = (billData.createdAt || '').split(' ');
    doc.text(`Date: ${datePart || ''}`, 5, y);
    doc.text(`Time: ${timePart || ''}`, 75, y, { align: 'right' });
    y += 4;
    doc.line(5, y, 75, y);
    y += 1;

    // 3. Items Table
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("SL DESCRIPTION", 5, y + 3);
    doc.text("QTY", 42, y + 3, { align: 'center' });
    doc.text("PRICE", 58, y + 3, { align: 'right' });
    doc.text("TOTAL", 75, y + 3, { align: 'right' });
    y += 5;
    doc.line(5, y, 75, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    billData.items?.forEach((item, i) => {
      doc.text(`${i + 1}`, 5, y);
      const itemName = item.name.toUpperCase();
      doc.text(itemName.length > 20 ? itemName.substring(0, 18) + '..' : itemName, 10, y);
      doc.text(`${item.quantity}`, 42, y, { align: 'center' });
      doc.text(`${item.unitPrice.toFixed(2)}`, 58, y, { align: 'right' });
      doc.text(`${item.total.toFixed(2)}`, 75, y, { align: 'right' });
      y += 5;
    });

    // 4. Totals Summary
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 4;
    doc.text(`Sub-Total (${billData.items?.length} Items)`, 5, y);
    doc.text(`${billData.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;

    if (shopConfig.gstEnabled) {
      doc.text(`CGST (${shopConfig.gstPercentage / 2}%)`, 5, y);
      doc.text(`${billData.cgst.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4.5;
      doc.text(`SGST (${shopConfig.gstPercentage / 2}%)`, 5, y);
      doc.text(`${billData.sgst.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4.5;
    }

    if (billData.discount > 0) {
      doc.text(`Discount`, 5, y);
      doc.text(`- ${billData.discount.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
    }

    const netAmount = shopConfig.gstEnabled ? billData.totalAmount : (billData.subtotal - (billData.discount || 0));
    doc.setLineDashPattern([], 0);
    doc.line(5, y, 75, y);
    y += 7;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NET AMOUNT", 5, y);
    doc.setFontSize(15);
    // Use Rs. for safety in jspdf unless we use a custom font
    doc.text(`Rs. ${netAmount.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;
    doc.line(5, y, 75, y);
    y += 6;

    // 5. Amount in Words - REMOVED AS REQUESTED
    // 6. Final Footer
    doc.setFillColor(0, 0, 0); doc.rect(5, y, 70, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    const disc = billData.discount || 0;
    doc.text(disc > 0 ? `YOU SAVED Rs. ${disc.toFixed(2)} ON THIS BILL!` : "THANK YOU FOR SHOPPING WITH US", pw / 2, y + 4.5, { align: 'center' });
    y += 12;
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    doc.text(`WhatsApp: ${shopConfig.contact.whatsapp}`, pw / 2, y, { align: 'center' });
    y += 4.5;
    doc.setFontSize(8); doc.text(shopConfig.tagline || "", pw / 2, y, { align: 'center' });
    y += 4; doc.setLineDashPattern([1, 1], 0); doc.line(5, y, 75, y); y += 10;
    doc.setLineDashPattern([], 0); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(shopConfig.footerMessage || "Thank you for visiting!", pw / 2, y, { align: 'center' });
    y += 6; doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(`Software by ${shopConfig.softwareBy}`, pw / 2, y, { align: 'center' });

    const pdfBlob = doc.output('blob');
    return new File([pdfBlob], `${shopConfig.name.replace(/\s+/g, '_')}_Bill_${billData.orderId}.pdf`, { type: 'application/pdf' });
  };

  // Auto-share once bill data is loaded
  useEffect(() => {
    if (billData && !loading) {
      // We can't always auto-open a popup (blocked by browsers), 
      // but we can try navigator.share if mobile, otherwise user still has the button.
      // For now, let's just make the manual button logic perfect as per user's preference.
    }
  }, [billData]);

  const shareOnWhatsApp = async () => {
    if (!billData) return;
    setLoading(true);
    try {
      const file = getBillPDFFile();
      if (!file) return;

      // 1. Prepare Data
      const phone = billData.customerPhone || "";
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const totalAmount = shopConfig.gstEnabled ? billData.totalAmount : (billData.subtotal - (billData.discount || 0));
      const message = `Here is your invoice for Order #${billData.orderId} from ${shopConfig.name}. Total: ₹${totalAmount.toFixed(2)}. \n\n(Note: Your Invoice PDF has been downloaded. Please attach it to this chat.)`;

      const waUrl = `https://web.whatsapp.com/send/?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

      // 2. Open WhatsApp Web FIRST (to ensure user context is used for the window)
      // Browsers are more likely to allow window.open if it's the first "big" action
      const waWindow = window.open(waUrl, '_blank');

      if (!waWindow) {
        // Fallback if window.open was blocked
        toast.error("Popup blocked! Please allow popups for this site or use the button again.");
      }

      // 3. Trigger PDF Download (with a tiny delay to ensure window.open gets priority)
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shopConfig.name.replace(/\s+/g, '_')}_Bill_${billData.orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Invoice PDF Downloaded & WhatsApp Opening...");
      }, 300);

    } catch (err) {
      console.error("WhatsApp share failed", err);
      toast.error("Failed to share invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Prepare calc object for ThermalReceipt
  const calc = billData ? {
    sub: billData.subtotal - (billData.discount || 0),
    cgst: shopConfig.gstEnabled ? billData.cgst : 0,
    sgst: shopConfig.gstEnabled ? billData.sgst : 0,
    total: shopConfig.gstEnabled ? billData.totalAmount : (billData.subtotal - (billData.discount || 0)),
    discount: billData.discount || 0,
    change: billData.changeReturned || 0,
    amountReceived: billData.amountReceived || 0
  } : {};

  return (
    <div className="page-container" style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div className="success-icon" style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '16px' }}>✅</div>
      <h1 style={{ marginBottom: 8, textAlign: 'center' }}>Payment Successful</h1>
      <p style={{ opacity: 0.8, marginTop: 0, textAlign: 'center' }}>
        Your payment was completed successfully via Easebuzz.
      </p>

      <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Transaction Details</h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div><strong>Order ID:</strong> {orderId || '-'}</div>
          <div><strong>Payment ID:</strong> {txnid || '-'}</div>
          {billData && <div><strong>Amount Paid:</strong> ₹{calc.total?.toFixed(2)}</div>}
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: '12px' }}>
        <button
          className="btn btn-success btn-lg"
          onClick={handlePrint}
          disabled={!billData}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          🖨️ Print Invoice
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={shareOnWhatsApp}
          disabled={!billData}
          style={{ flex: 1, backgroundColor: '#25D366', borderColor: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          📱 Share WhatsApp
        </button>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link className="btn btn-primary" to="/">Go Home</Link>
        <Link className="btn btn-outline" to="/counter">New Billing</Link>
      </div>

      {/* Hidden Thermal Receipt for Printing */}
      <ThermalReceipt
        billData={billData}
        calc={calc}
      />
    </div>
  );
}

