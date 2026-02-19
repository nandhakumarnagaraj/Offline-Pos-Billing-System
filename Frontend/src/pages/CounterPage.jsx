import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getOrders, getActiveOrders, processPayment, getBill, updateOrderStatus, getAvailableMenuItems, getActiveCategories, createOrder, getOrdersByDate, initiateDigitalPayment, verifyEasebuzzPayment } from '../service/api';
import { connectWebSocket } from '../service/ws';
import { useAuth } from '../context/AuthContext';
import ThermalReceipt from '../components/ThermalReceipt';
import { addPendingSync } from '../db';
import { useConfig } from '../context/ConfigContext';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';
import './CounterPage.css';

function CounterPage() {
  const navigate = useNavigate();
  const { config: shopConfig } = useConfig();
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billData, setBillData] = useState(null);
  const [view, setView] = useState('pending'); // 'pending', 'bill', 'history'
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [isMultiPay, setIsMultiPay] = useState(false);
  const [addedPayments, setAddedPayments] = useState([]); // { mode: 'CASH', amount: 500 }
  const [upiId, setUpiId] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [multiPayMode, setMultiPayMode] = useState('CASH');

  // History Pagination State
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(12);

  const [stockAlerts, setStockAlerts] = useState([]);

  // Takeaway State
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showVariationModal, setShowVariationModal] = useState(null); // { item }

  useEffect(() => {
    loadOrders();
    loadTakeawayData();
    const stompClient = connectWebSocket(
      (order) => {
        setOrders(prev => {
          const idx = prev.findIndex(o => o.id === order.id);
          if (order.status === 'PAID' || order.status === 'CANCELLED') {
            return prev.filter(o => o.id !== order.id);
          }
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = order;
            return updated;
          }
          return [...prev, order];
        });

        // Update history state for PAID orders
        if (order.status === 'PAID') {
          setAllOrders(prev => {
            const exists = prev.find(o => o.id === order.id);
            if (exists) return prev.map(o => o.id === order.id ? order : o);
            return [order, ...prev];
          });
        }
      },
      null, // No table updates for counter
      (alert) => {
        toast.error(alert, { duration: 6000 });
      }
    );
    return () => { if (stompClient) stompClient.deactivate(); };
  }, []);


  useEffect(() => {
    const { total } = calculateBill();
    // Only prefill in Single Payment mode (where isMultiPay is false)
    if (!isMultiPay && paymentMode === 'CASH' && total) {
      setAmountReceived(total.toFixed(2));
    } else if (!isMultiPay) {
      setAmountReceived('');
    }
  }, [paymentMode, billData, discount, isMultiPay]);

  const loadOrders = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [activeRes, allRes] = await Promise.all([
        getActiveOrders(),
        getOrdersByDate(today, today)
      ]);
      setOrders(activeRes.data);
      // Sort history to show newest first
      setAllOrders(allRes.data.filter(o => o.status === 'PAID').sort((a, b) => b.id - a.id));
    } catch (err) { console.error(err); }
  };

  const loadTakeawayData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([getAvailableMenuItems(), getActiveCategories()]);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
    } catch (err) { console.error(err); }
  };

  const selectForBilling = async (order) => {
    setSelectedOrder(order);
    try {
      const res = await getBill(order.id);
      setBillData(res.data);
      setWhatsappPhone(res.data.customerPhone || '');
      setView('bill');
      setDiscount('');
      setAmountReceived('');
      setIsMultiPay(false);
      setAddedPayments([]);
      setPaymentMode('CASH');
    } catch (err) { console.error(err); }
  };

  const handleReprint = async (order) => {
    try {
      const res = await getBill(order.id);
      setBillData(res.data);
      // For PAID orders, we should use the actual discount from the order
      setDiscount(order.discount || 0);
      setTimeout(() => window.print(), 500);
    } catch (err) {
      console.error("Reprint failed", err);
      toast.error("Failed to fetch bill data for reprint.");
    }
  };

  const handleWhatsAppShareHistory = async (order) => {
    setLoading(true);
    try {
      const res = await getBill(order.id);
      const bData = res.data;
      const disc = order.discount || 0;

      const file = await getBillPDFFile(bData, disc);
      if (!file) return;

      // 1. Prepare Data
      let totalCgst = 0;
      let totalSgst = 0;
      bData.items?.forEach(item => {
        const itemGst = item.gstPercent || shopConfig.gstPercentage;
        const itemTax = (item.total * (itemGst / 100));
        totalCgst += itemTax / 2;
        totalSgst += itemTax / 2;
      });
      const total = (bData.subtotal - disc) + totalCgst + totalSgst;

      const phone = bData.customerPhone || "";
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const message = `Here is your invoice for Order #${bData.orderId} from ${shopConfig.name}. Total: ₹${total.toFixed(2)}. \n\n(Note: Your Invoice PDF has been downloaded. Please attach it to this chat.)`;

      const waUrl = `https://web.whatsapp.com/send/?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

      // 2. Open WhatsApp Web FIRST
      const waWindow = window.open(waUrl, '_blank');
      if (!waWindow) {
        toast.error("Popup blocked! Please allow popups for this site.");
      }

      // 3. Trigger Download
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${shopConfig.name.replace(/\s+/g, '_')}_Bill_${bData.orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Invoice PDF Downloaded & WhatsApp Opening...");
      }, 300);

    } catch (err) {
      console.error("WhatsApp share failed", err);
      toast.error("Failed to share invoice via WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    const isOnline = !isMultiPay ? (paymentMode === 'ONLINE') : addedPayments.some(p => p.mode === 'ONLINE');
    if (isOnline && (!whatsappPhone || whatsappPhone.trim().length < 10)) {
      toast.error('Customer WhatsApp number is required for digital payments');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        orderId: selectedOrder.id,
        discount: parseFloat(discount) || 0,
        gstEnabled: shopConfig.gstEnabled,
        transactionRef: ''
      };

      if (isMultiPay) {
        payload.paymentModes = addedPayments;
        payload.amountReceived = addedPayments.reduce((sum, p) => sum + p.amount, 0);
      } else {
        payload.paymentMode = paymentMode;
        payload.amountReceived = parseFloat(amountReceived) || 0;
      }

      // Compute the total bill amount fresh (not from stale calc)
      const disc = parseFloat(discount) || 0;
      let freshTotal = 0;
      if (billData) {
        let totalCgst = 0, totalSgst = 0;
        billData.items?.forEach(item => {
          const itemGst = item.gstPercent || shopConfig.gstPercentage;
          const itemTax = (item.total * (itemGst / 100));
          totalCgst += itemTax / 2;
          totalSgst += itemTax / 2;
        });
        const sub = billData.subtotal - disc;
        const cgst = shopConfig.gstEnabled ? totalCgst : 0;
        const sgst = shopConfig.gstEnabled ? totalSgst : 0;
        freshTotal = sub + cgst + sgst;
      }

      // Check if digital payment is needed
      let onlinePay = isMultiPay ? addedPayments.find(p => p.mode === 'ONLINE') : null;

      // If in Split Mode and Easebuzz is selected in dropdown but NOT added to list yet,
      // compute remaining balance directly from addedPayments
      if (isMultiPay && !onlinePay && multiPayMode === 'ONLINE') {
        const totalPaidSoFar = addedPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, freshTotal - totalPaidSoFar);
        if (remaining > 0) {
          onlinePay = { mode: 'ONLINE', amount: remaining };
        }
      }

      const isDigital = (!isMultiPay && paymentMode === 'ONLINE') || (isMultiPay && onlinePay);

      if (isDigital) {
        try {
          const splitAmt = isMultiPay ? onlinePay.amount : freshTotal;
          // Metadata: all non-ONLINE payments in the addedPayments list
          const nonOnlineParts = addedPayments.filter(p => p.mode !== 'ONLINE');
          const metadata = isMultiPay && nonOnlineParts.length > 0
            ? nonOnlineParts.map(p => `${p.mode}:${p.amount}`).join(',')
            : '';

          console.log('[Split Payment] splitAmt:', splitAmt, '| metadata:', metadata, '| freshTotal:', freshTotal, '| addedPayments:', addedPayments);

          const res = await initiateDigitalPayment(selectedOrder.id, disc, 'ONLINE', splitAmt, metadata);

          if (res.data && res.data.action && res.data.fields) {
            // Create hidden form and submit
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = res.data.action;
            form.style.display = 'none'; // Ensure form is hidden

            Object.entries(res.data.fields).forEach(([key, value]) => {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = value;
              form.appendChild(input);
            });

            document.body.appendChild(form);
            console.log('Submitting Easebuzz form to:', res.data.action);
            form.submit();
            // Optional: Remove form after submit to clean up DOM, though page redirect will happen
            // document.body.removeChild(form); 
            return;

          } else {
            toast.error('Invalid response from payment server');
            setLoading(false);
          }
        } catch (err) {
          toast.error('Failed to initiate digital payment: ' + (err.response?.data?.message || err.message));
          setLoading(false);
        }
        return;
      }

      await processPayment(payload);

      toast.success('Payment processed!');

      // Automatically trigger WhatsApp PDF Share
      await autoShareWhatsAppBill();

      setSelectedOrder(null);
      setBillData(null);
      setView('pending');
      loadOrders();
    } catch (err) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const paymentData = {
          orderId: selectedOrder.id,
          discount: parseFloat(discount) || 0,
          transactionRef: '',
          paymentModes: isMultiPay ? addedPayments : undefined,
          paymentMode: isMultiPay ? undefined : paymentMode,
          amountReceived: isMultiPay ? addedPayments.reduce((sum, p) => sum + p.amount, 0) : (parseFloat(amountReceived) || 0)
        };
        await addPendingSync('PROCESS_PAYMENT', paymentData);
        toast('Network error: Payment saved LOCALLY. It will sync automatically when online.', { icon: '📡' });

        setSelectedOrder(null);
        setBillData(null);
        setView('pending');
      } else {
        toast.error('Payment failed: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  const submitTakeawayOrder = async () => {
    if (Object.keys(cart).length === 0) {
      toast.error('Please add items to the order.');
      return;
    }
    if (!customerName || customerName.trim() === '') {
      toast.error('Customer Name is required');
      return;
    }
    if (!customerPhone || customerPhone.trim().length < 10) {
      toast.error('Customer WhatsApp number is required');
      return;
    }
    setLoading(true);
    try {
      const orderItems = Object.values(cart).map(c => ({
        menuItemId: c.item.id,
        variationId: c.variation ? c.variation.id : null,
        quantity: c.qty
      }));

      const res = await createOrder({
        customerName,
        customerPhone,
        tableNumber: 'TAKEAWAY',
        orderType: 'TAKEAWAY',
        createdBy: 'Cashier',
        gstEnabled: shopConfig.gstEnabled,
        items: orderItems
      });

      toast.success('Takeaway order created!');
      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      loadOrders();

      // Auto-select for billing
      selectForBilling(res.data);
    } catch (err) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const orderData = {
          customerName,
          customerPhone,
          tableNumber: 'TAKEAWAY',
          orderType: 'TAKEAWAY',
          createdBy: 'Cashier',
          items: Object.values(cart).map(c => ({
            menuItemId: c.item.id,
            variationId: c.variation ? c.variation.id : null,
            quantity: c.qty
          }))
        };
        await addPendingSync('CREATE_ORDER', orderData);
        toast('Network error: Takeaway order saved LOCALLY. It will sync automatically when online.', { icon: '📡' });

        setCart({});
        setCustomerName('');
        setCustomerPhone('');
        setView('pending');
      } else {
        toast.error('Failed to create takeaway order: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  const addToCart = (item, variation = null) => {
    if (item.variations && item.variations.length > 0 && !variation) {
      setShowVariationModal(item);
      return;
    }
    const cartKey = variation ? `${item.id}-${variation.id}` : `${item.id}`;
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        item,
        variation,
        qty: (prev[cartKey]?.qty || 0) + 1
      }
    }));
    setShowVariationModal(null);
  };

  const removeFromCart = (cartKey) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[cartKey]?.qty > 1) {
        updated[cartKey] = { ...updated[cartKey], qty: updated[cartKey].qty - 1 };
      } else {
        delete updated[cartKey];
      }
      return updated;
    });
  };

  const cartTotal = Object.values(cart).reduce((sum, c) => {
    const price = c.variation ? c.variation.price : c.item.price;
    return sum + price * c.qty;
  }, 0);

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

  const getBillPDFFile = async (customBillData = null, customDiscount = null) => {
    const data = customBillData || billData;
    const disc = customDiscount !== null ? customDiscount : (parseFloat(discount) || 0);
    if (!data) return null;

    const doc = new jsPDF({ format: [80, 230], unit: 'mm' });
    const pw = 80;
    let y = 5;

    // 1. Header Section
    if (shopConfig.logo) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = shopConfig.logo;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Use canvas to get a clean base64 PNG string
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");

        doc.addImage(dataUrl, 'PNG', pw / 2 - 12, y, 24, 24);
        y += 30;
      } catch (e) {
        console.error("PDF Logo Error:", e);
        y += 5;
      }
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
    if (shopConfig.gstEnabled && shopConfig.gstin) {
      doc.text(`GSTIN: ${shopConfig.gstin.toUpperCase()}`, pw / 2, y, { align: 'center' });
      y += 3.5;
    }
    if (shopConfig.fssai) {
      doc.text(`FSSAI: ${shopConfig.fssai}`, pw / 2, y, { align: 'center' });
      y += 3;
    }

    doc.setLineWidth(0.3);
    doc.line(5, y, 75, y);
    y += 4.5;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(shopConfig.gstEnabled ? "TAX INVOICE" : "INVOICE", pw / 2, y, { align: 'center' });
    y += 1.5;
    doc.setLineWidth(0.1);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y + 1.5, 75, y + 1.5);
    y += 5;

    // 2. Meta Information
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8.5);

    // Line 1: Bill No (Left) & Type (Right)
    doc.setFont("helvetica", "bold");
    doc.text("Bill No: ", 5, y);
    let labelWidth = doc.getTextWidth("Bill No: ");
    doc.setFont("helvetica", "normal");
    doc.text(`${data.orderId}`, 5 + labelWidth, y);

    doc.setFont("helvetica", "normal");
    let typeValue = data.orderType?.replace('_', ' ') || '';
    doc.text(typeValue, 75, y, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.text("Type: ", 75 - doc.getTextWidth(typeValue) - 1, y, { align: 'right' });
    y += 4.5;

    // Line 2: Date (Left) & Time (Right)
    const [datePart, timePart] = (data.createdAt || '').split(' ');
    doc.setFont("helvetica", "bold");
    doc.text("Date: ", 5, y);
    labelWidth = doc.getTextWidth("Date: ");
    doc.setFont("helvetica", "normal");
    doc.text(`${datePart || ''}`, 5 + labelWidth, y);

    doc.setFont("helvetica", "normal");
    let timeVal = timePart || '';
    doc.text(timeVal, 75, y, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.text("Time: ", 75 - doc.getTextWidth(timeVal) - 1, y, { align: 'right' });
    y += 4.5;

    if (data.customerName || data.customerPhone) {
      if (data.customerName) {
        doc.setFont("helvetica", "bold");
        doc.text("Cust: ", 5, y);
        labelWidth = doc.getTextWidth("Cust: ");
        doc.setFont("helvetica", "normal");
        doc.text(`${data.customerName}`, 5 + labelWidth, y);
      }
      if (data.customerPhone) {
        doc.setFont("helvetica", "normal");
        let phoneVal = data.customerPhone || '';
        doc.text(phoneVal, 75, y, { align: 'right' });
        doc.setFont("helvetica", "bold");
        doc.text("Phone: ", 75 - doc.getTextWidth(phoneVal) - 1, y, { align: 'right' });
      }
      y += 4.5;
    }
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
    data.items?.forEach((item, i) => {
      const itemName = item.name.toUpperCase();
      // Split text into multiple lines if too long (max width ~30mm)
      const splitName = doc.splitTextToSize(itemName, 30);
      
      doc.text(`${i + 1}`, 5, y);
      doc.text(splitName, 10, y);
      doc.text(`${item.quantity}`, 42, y, { align: 'center' });
      doc.text(`${item.unitPrice.toFixed(2)}`, 58, y, { align: 'right' });
      doc.text(`${item.total.toFixed(2)}`, 75, y, { align: 'right' });
      
      // Calculate how much space this item took
      const itemHeight = (splitName.length * 3.5);
      y += Math.max(5, itemHeight);
    });

    // 4. Totals Summary
    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 4;
    doc.text(`Sub-Total (${data.items?.length} Items)`, 5, y);
    doc.text(`${data.subtotal.toFixed(2)}`, 75, y, { align: 'right' });
    y += 4;

    let totalCgst = 0;
    let totalSgst = 0;
    data.items?.forEach(item => {
      const itemGst = item.gstPercent || shopConfig.gstPercentage;
      const itemTax = (item.total * (itemGst / 100));
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });

    if (shopConfig.gstEnabled && (data.gstEnabled ?? gstEnabled)) {
      doc.text(`CGST (${shopConfig.gstPercentage / 2}%)`, 5, y);
      doc.text(`${totalCgst.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4.5;
      doc.text(`SGST (${shopConfig.gstPercentage / 2}%)`, 5, y);
      doc.text(`${totalSgst.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4.5;
    }

    if (disc > 0) {
      doc.text(`Savings & Discount`, 5, y);
      doc.text(`- ${disc.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
    }

    const netAmount = (data.subtotal - disc) + ((shopConfig.gstEnabled && (data.gstEnabled ?? gstEnabled)) ? (totalCgst + totalSgst) : 0);
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
    y += 5;

    // Payment Details in PDF
    const pMode = data.paymentMode || paymentMode;
    const pModes = data.paymentModes || (pMode === 'SPLIT' ? addedPayments : []);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT DETAILS", 5, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    
    if (pMode === 'SPLIT' || pModes.length > 0) {
      pModes.forEach(p => {
        doc.text(`${p.mode}`, 5, y);
        doc.text(`${p.amount.toFixed(2)}`, 75, y, { align: 'right' });
        y += 4;
      });
    } else {
      doc.text(`Mode: ${pMode}`, 5, y);
      const amtRec = data.amountReceived || parseFloat(amountReceived) || netAmount;
      doc.text(`${amtRec.toFixed(2)}`, 75, y, { align: 'right' });
      y += 4;
    }

    doc.setLineDashPattern([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 4;

    // 6. Final Footer
    doc.setFillColor(0, 0, 0); doc.rect(5, y, 70, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
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
    doc.text(`Software by Khana Book`, pw / 2, y, { align: 'center' });

    const pdfBlob = doc.output('blob');
    return new File([pdfBlob], `${shopConfig.name.replace(/\s+/g, '_')}_Bill_${data.orderId}.pdf`, { type: 'application/pdf' });
  };

  const autoShareWhatsAppBill = async () => {
    if (!billData) return;
    try {
      const file = await getBillPDFFile();
      if (!file) return;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${billData.orderId}`,
          text: `Here is your bill from ${shopConfig.name} for ₹${calc.total.toFixed(2)}. Have a great day!`,
        });
      }
    } catch (err) {
      console.error("Auto-share failed", err);
    }
  };

  const calculateBill = () => {
    if (!billData) return {};
    const disc = parseFloat(discount) || 0;

    // Calculate tax based on item-specific GST rates
    let totalCgst = 0;
    let totalSgst = 0;

    billData.items?.forEach(item => {
      const itemGst = item.gstPercent || shopConfig.gstPercentage;
      const itemTax = (item.total * (itemGst / 100));
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });

    const sub = billData.subtotal - disc;
    const cgst = shopConfig.gstEnabled ? (totalCgst) : 0;
    const sgst = shopConfig.gstEnabled ? (totalSgst) : 0;
    const total = sub + cgst + sgst;
    const received = parseFloat(amountReceived) || 0;
    const change = received > total ? received - total : 0;

    // For MultiPay
    const totalPaidSoFar = addedPayments.reduce((sum, p) => sum + p.amount, 0);
    const multiPayRemaining = Math.max(0, total - totalPaidSoFar);

    return { 
      sub, cgst, sgst, total, change, multiPayRemaining, totalPaidSoFar,
      paymentMode,
      paymentModes: addedPayments,
      amountReceived: parseFloat(amountReceived) || 0
    };
  };

  const calc = calculateBill();
  const activeOrdersList = orders.filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED');

  return (
    <div className="counter-page">
      <header className="counter-header">
        <div className="counter-header-left">
          <Link to="/" className="back-btn">←</Link>
          <h1>💰 Counter</h1>
        </div>
        <nav className="counter-tabs">
          <button className={`tab ${view === 'pending' ? 'active' : ''}`} onClick={() => { setView('pending'); setSelectedOrder(null); }}>
            Pending Bills
          </button>
          <button className={`tab ${view === 'takeaway' ? 'active' : ''}`} onClick={() => { setView('takeaway'); setSelectedOrder(null); }}>
            Takeaway
          </button>
          <button className={`tab ${view === 'history' ? 'active' : ''}`} onClick={() => { setView('history'); setSelectedOrder(null); }}>
            All Orders
          </button>
          <button className="btn btn-outline btn-sm logout-btn-header" onClick={logout} style={{ marginLeft: '16px' }}>Sign Out</button>
        </nav>
      </header>

      <div className="counter-body">
        {/* PENDING ORDERS */}
        {view === 'pending' && (
          <div className="counter-orders animate-fadeIn">
            <h2>Orders Ready for Billing</h2>
            {activeOrdersList.length === 0 && <div className="empty-state">No pending orders</div>}
            <div className="counter-orders-grid">
              {activeOrdersList.map(order => (
                <div key={order.id} className={`counter-order-card status-${order.status?.toLowerCase()}`}
                  onClick={() => selectForBilling(order)}>
                  <div className="co-top">
                    <span className="co-id">{order.id}</span>
                    <span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span>
                  </div>
                  <div className="co-info">
                    <div>📍 {order.tableNumber}</div>
                    {order.customerName && <div>👤 {order.customerName}</div>}
                    <div>🍽️ {order.orderType?.replace('_', ' ')}</div>
                  </div>
                  <div className="co-items">
                    {order.items?.map(i => (
                      <span key={i.id} className="co-item-tag">{i.quantity}x {i.menuItem?.name}</span>
                    ))}
                  </div>
                  <div className="co-bottom">
                    <span className="co-total">₹{order.totalAmount?.toFixed(2)}</span>
                    <span className="co-time">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAKEAWAY ORDERING */}
        {view === 'takeaway' && (
          <div className="counter-takeaway animate-fadeIn">
            <div className="takeaway-layout">
              <div className="takeaway-menu">
                <div className="menu-header-c">
                  <input className="input search-c" placeholder="🔍 Search menu..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <div className="cat-scroll">
                    <button className={`cat-btn-c ${activeCategory === 'All' ? 'active' : ''}`}
                      onClick={() => setActiveCategory('All')}>All</button>
                    {categories.map(cat => (
                      <button key={cat.id} className={`cat-btn-c ${activeCategory === cat.name ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.name)}>{cat.name}</button>
                    ))}
                  </div>
                </div>
                <div className="takeaway-grid">
                  {menuItems.filter(item => {
                    const matchCat = activeCategory === 'All' || item.category === activeCategory;
                    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchCat && matchSearch;
                  }).map(item => {
                    const hasVariations = item.variations && item.variations.length > 0;
                    const displayPrice = hasVariations
                      ? Math.min(...item.variations.map(v => v.price))
                      : item.price;
                    const inCartQty = !hasVariations && cart[item.id] ? cart[item.id].qty : 0;

                    return (
                      <div key={item.id} className={`c-item-card ${inCartQty > 0 ? 'active' : ''}`} onClick={() => addToCart(item)}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="c-item-img" loading="lazy" />
                        ) : (
                          <div className="image-placeholder">
                            <img src={shopConfig.logo} alt="Logo" style={{ width: '30px', opacity: 0.5 }} />
                          </div>
                        )}
                        <div className="c-item-details">
                          <div className="c-item-title">{item.name}</div>
                          <div className="c-item-price">₹{displayPrice}{hasVariations ? '+' : ''}</div>
                        </div>
                        {inCartQty > 0 && <div className="cart-badge-qty">{inCartQty}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="takeaway-cart glass-card">
                <div className="flex-between">
                  <h3>New Order</h3>
                </div>
                <div className="customer-inputs-c">
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="Customer Name *" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#EF4444', fontSize: '14px' }}>*</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="WhatsApp Number *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#EF4444', fontSize: '14px' }}>*</span>
                  </div>
                </div>
                <div className="cart-list-c">
                  {Object.keys(cart).length === 0 ? (
                    <div className="empty-cart-c">Cart is empty</div>
                  ) : (
                    Object.entries(cart).map(([key, c]) => (
                      <div key={key} className="cart-item-c">
                        <div className="item-details-c">
                          <span className="item-name-c">{c.item.name} {c.variation ? `(${c.variation.name})` : ''}</span>
                          <div className="item-qty-c">
                            <button className="qty-btn-c" onClick={() => removeFromCart(key)}>−</button>
                            <span>{c.qty}</span>
                            <button className="qty-btn-c" onClick={() => addToCart(c.item, c.variation)}>+</button>
                          </div>
                        </div>
                        <span className="item-total-c">₹{((c.variation?.price || c.item.price) * c.qty).toFixed(0)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="cart-footer-c">
                  <div className="cart-grand-total">Total: ₹{cartTotal.toFixed(2)}</div>

                  <button className="btn btn-success btn-block btn-lg" onClick={submitTakeawayOrder} disabled={loading || Object.keys(cart).length === 0}>
                    {loading ? '⏳ Creating...' : '🍳 Place Takeaway Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BILL VIEW */}
        {view === 'bill' && billData && (
          <div className="bill-view animate-fadeIn">
            <div className="bill-container">
              {/* Bill Preview */}
              <div className="bill-preview glass-card">
                <div className="bill-header-sec">
                  <div className="flex-between">
                    <h2>Invoice</h2>
                    <button className="btn btn-outline" onClick={handlePrint}>
                      Print Receipt
                    </button>
                  </div>
                  <div className="bill-meta">
                    <div><span className="meta-label">Order ID:</span> {billData.orderId}</div>
                    {billData.orderType !== 'TAKEAWAY' && <div><span className="meta-label">Table:</span> {billData.tableNumber}</div>}
                    <div><span className="meta-label">Type:</span> {billData.orderType?.replace('_', ' ')}</div>
                    {billData.customerName && <div className="span-2"><span className="meta-label">Customer:</span> {billData.customerName}</div>}
                  </div>
                </div>

                <div className="bill-main-content">
                  <table className="bill-table">
                    <thead>
                      <tr><th>SL</th><th>Item</th><th>QTY</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {billData.items?.map((item, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bill-totals">
                    <div className="bill-row"><span>Subtotal</span><span>₹{billData.subtotal?.toFixed(2)}</span></div>
                    {shopConfig.gstEnabled && (
                      <>
                        <div className="bill-row"><span>CGST ({shopConfig.gstPercentage / 2}%)</span><span>₹{calc.cgst?.toFixed(2)}</span></div>
                        <div className="bill-row"><span>SGST ({shopConfig.gstPercentage / 2}%)</span><span>₹{calc.sgst?.toFixed(2)}</span></div>
                      </>
                    )}
                    <div className="bill-row bill-grand-total">
                      <span>Grand Total</span>
                      <span>₹{calc.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Panel */}
              <div className="payment-panel glass-card">
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h3>Payment</h3>
                  </div>
                </div>

                {!isMultiPay && paymentMode !== 'SPLIT' ? (
                  <>
                    <div className="payment-modes">
                      {['CASH', 'ONLINE', 'SPLIT'].map(mode => (
                        <button key={mode}
                          className={`payment-mode-btn ${paymentMode === mode ? 'active' : ''}`}
                          onClick={() => {
                            setPaymentMode(mode);
                            if (mode === 'SPLIT') {
                              setIsMultiPay(true);
                              setAddedPayments([]);
                            } else {
                              setIsMultiPay(false);
                            }
                          }}>
                          <span className="mode-icon">
                            {mode === 'CASH' ? '💵' : mode === 'ONLINE' ? '🌐' : '⚖️'}
                          </span>
                          <span className="mode-name">
                            {mode === 'ONLINE' ? 'Easebuzz' : mode === 'SPLIT' ? 'Split Payment' : mode}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="payment-fields">
                      {paymentMode === 'ONLINE' && (
                        <div className="whatsapp-field" style={{ marginBottom: '16px' }}>
                          <label>Customer WhatsApp <span style={{ color: '#EF4444' }}>*</span></label>
                          <input className="input" type="text" placeholder="10-digit number" value={whatsappPhone}
                            onChange={e => setWhatsappPhone(e.target.value)} required />
                        </div>
                      )}

                      {paymentMode === 'CASH' && (
                        <>
                          <label>Amount Received (₹)</label>
                          <input className="input" type="number" placeholder="0" value={amountReceived}
                            onChange={e => setAmountReceived(e.target.value)} />
                          {calc.change > 0 && (
                            <div className="change-display" style={{ marginTop: '10px', color: '#10B981', fontWeight: 'bold' }}>
                              Change: ₹{calc.change.toFixed(2)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="multi-pay-section animate-fadeIn">
                    <div className="payment-modes" style={{ marginBottom: '20px' }}>
                      {['CASH', 'ONLINE', 'SPLIT'].map(mode => (
                        <button key={mode}
                          className={`payment-mode-btn ${paymentMode === mode ? 'active' : ''}`}
                          onClick={() => {
                            setPaymentMode(mode);
                            if (mode === 'SPLIT') {
                              setIsMultiPay(true);
                            } else {
                              setIsMultiPay(false);
                              setAddedPayments([]);
                            }
                          }}>
                          <span className="mode-icon">
                            {mode === 'CASH' ? '💵' : mode === 'ONLINE' ? '🌐' : '⚖️'}
                          </span>
                          <span className="mode-name">
                            {mode === 'ONLINE' ? 'Easebuzz' : mode === 'SPLIT' ? 'Split Payment' : mode}
                          </span>
                        </button>
                      ))}
                    </div>


                    <div className="payment-summary-box">
                      <div>Total Due: <strong>₹{calc.total.toFixed(2)}</strong></div>
                      <div style={{ color: calc.multiPayRemaining > 0 ? '#EF4444' : '#10B981' }}>
                        Remaining: <strong>₹{calc.multiPayRemaining.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="add-payment-row">
                      <select className="input" value={multiPayMode} onChange={e => {
                        const val = e.target.value;
                        setMultiPayMode(val);
                        if (val === 'ONLINE') {
                          setAmountReceived(calc.multiPayRemaining.toFixed(2));
                        }
                      }}>
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Easebuzz</option>
                      </select>
                      <input className="input" type="number" placeholder="Amount"
                        value={amountReceived} onChange={e => setAmountReceived(e.target.value)} />
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        const amt = parseFloat(amountReceived);
                        if (isNaN(amt) || amt <= 0) return;
                        setAddedPayments([...addedPayments, { mode: multiPayMode, amount: amt }]);
                        setAmountReceived('');
                      }} disabled={!amountReceived}>Add</button>
                    </div>

                    <div className="added-payments-list">
                      {addedPayments.map((p, i) => (
                        <div key={i} className="added-payment-item">
                          <span>{p.mode}</span>
                          <span>₹{p.amount}</span>
                          <button className="delete-btn" onClick={() => setAddedPayments(addedPayments.filter((_, idx) => idx !== i))}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                <div className="payment-actions">
                  <button className="btn btn-outline" onClick={() => { setView('pending'); setSelectedOrder(null); }}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handlePayment}
                    disabled={loading || (isMultiPay && calc.multiPayRemaining > 0 && multiPayMode !== 'ONLINE')}>
                    {loading ? '⏳ Processing...' : (
                      isMultiPay
                        ? (multiPayMode === 'ONLINE' && calc.multiPayRemaining > 0
                          ? `✅ Settle (₹${calc.multiPayRemaining.toFixed(2)} via Easebuzz)`
                          : '✅ Settle Bill')
                        : `✅ Pay ₹${calc.total?.toFixed(2)}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDER HISTORY */}
        {view === 'history' && (
          <div className="history-view animate-fadeIn">
            <div className="glass-card history-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>OrderID</th><th>Type</th>
                    <th>Items</th><th>Total</th><th>Status</th><th>Time</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize).map((order, idx) => (
                    <tr key={order.id} className={`row-${order.status?.toLowerCase()} animate-fadeIn`} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <td><span className="order-id-badge">{order.id}</span></td>
                      <td><span className="type-tag">{order.orderType?.replace('_', ' ')}</span></td>
                      <td>{order.items?.length} items</td>
                      <td className="amount-cell">₹{order.totalAmount?.toFixed(2)}</td>
                      <td><span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span></td>
                      <td className="time-cell">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</td>
                      <td>
                        <div className="action-cell" style={{ display: 'flex', gap: '4px' }}>
                          {order.status === 'PAID' && (
                            <>
                              <button className="btn btn-xs btn-primary" onClick={(e) => {
                                e.stopPropagation();
                                handleReprint(order);
                              }}>Reprint</button>
                              <button className="btn btn-xs btn-success" style={{ backgroundColor: '#25D366', borderColor: '#25D366' }} onClick={(e) => {
                                e.stopPropagation();
                                handleWhatsAppShareHistory(order);
                              }}>WhatsApp</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allOrders.length === 0 && (
                    <tr><td colSpan="8" className="empty-state">No orders for today yet.</td></tr>
                  )}
                </tbody>
              </table>

              {allOrders.length > historyPageSize && (
                <div className="pagination">
                  <button className="page-btn" disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>←</button>
                  <span className="page-info">Page {historyPage} of {Math.ceil(allOrders.length / historyPageSize)}</span>
                  <button className="page-btn" disabled={historyPage === Math.ceil(allOrders.length / historyPageSize)} onClick={() => setHistoryPage(p => p + 1)}>→</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden for screen, shown for printer */}
      <ThermalReceipt
        billData={billData}
        calc={{ ...calc, discount: parseFloat(discount) || 0 }}
      />

      {/* Variation Selection Modal */}
      <Modal
        isOpen={!!showVariationModal}
        onClose={() => setShowVariationModal(null)}
        title={showVariationModal?.name || 'Select Variation'}
      >
        <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Select your favorite variation</div>
        <div className="variation-options-modern">
          {showVariationModal?.variations?.map(v => (
            <div key={v.id} className="variation-card-modern" onClick={() => addToCart(showVariationModal, v)}>
              <div className="v-card-info">
                <span className="v-name">{v.name}</span>
                <span className="v-price">₹{v.price}</span>
              </div>
              <div className="v-add-icon">+</div>
            </div>
          ))}
        </div>
      </Modal>

      {loading && <LoadingOverlay message="Processing Order..." />}
    </div >
  );
}

export default CounterPage;
