import React from 'react';
import './ThermalReceipt.css';
import { useConfig } from '../context/ConfigContext';

const ThermalReceipt = ({ billData, calc }) => {
  const { config: shopConfig } = useConfig();
  if (!billData) return null;

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).split('/').join('-');

  const time = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const savings = (parseFloat(calc.discount) || 0);

  const maskString = (str) => {
    if (!str) return '';
    return str.split('').map((char, index) => index % 2 !== 0 ? '@' : char).join('');
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
      return 'Big Number';
    };

    const whole = Math.floor(num);
    return convert(whole) + 'Rupees Only';
  };

  const amountInWords = calc.totalInWords || numberToWords(calc.total);

  return (
    <div className="thermal-receipt-wrap">
      <div className="thermal-receipt" id="thermal-receipt">
        {/* === HEADER SECTION === */}
        <header className="receipt-header">
          <div className="receipt-logo">
            <img src={shopConfig.logo} alt="Store Logo" className="logo-img" />
          </div>
          <h1 className="store-name">{shopConfig.name}</h1>
          <div className="store-details">
            {shopConfig.address.map((line, i) => (
              <p key={i} className="store-address">{line}</p>
            ))}
            {shopConfig.gstEnabled && shopConfig.gstin && (
              <p className="store-gstin">GSTIN: {shopConfig.gstin}</p>
            )}
            <p className="store-fssai">FSSAI: {shopConfig.fssai}</p>
          </div>
          <div className="divider-double"></div>
          <h2 className="invoice-title">{shopConfig.gstEnabled ? 'TAX INVOICE' : 'INVOICE'}</h2>
          <div className="divider-dashed"></div>
        </header>

        {/* === INFO SECTION === */}
        <section className="bill-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Bill No:</span>
              <span className="value">{billData.orderId}</span>
            </div>
            <div className="info-item text-right">
              <span className="label">Type:</span>
              <span className="value">{billData.orderType?.replace('_', ' ')}</span>
            </div>
            <div className="info-item">
              <span className="label">Date:</span>
              <span className="value">{today}</span>
            </div>
            <div className="info-item text-right">
              <span className="label">Time:</span>
              <span className="value">{time}</span>
            </div>
            {billData.customerName && (
              <div className="info-item">
                <span className="label">Cust:</span>
                <span className="value">{maskString(billData.customerName)}</span>
              </div>
            )}
            {billData.customerPhone && (
              <div className="info-item text-right">
                <span className="label">Phone:</span>
                <span className="value">{maskString(billData.customerPhone)}</span>
              </div>
            )}
          </div>
        </section>

        <div className="divider-solid"></div>

        {/* === ITEMS SECTION === */}
        <table className="items-table">
          <thead>
            <tr>
              <th className="col-sl">SL</th>
              <th className="col-item">DESCRIPTION</th>
              <th className="col-qty">QTY</th>
              <th className="col-price">PRICE</th>
              <th className="col-amount">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {billData.items?.map((item, idx) => (
              <tr key={idx} className="item-row">
                <td className="col-sl">{idx + 1}</td>
                <td className="col-item">
                  <div className="item-name">{item.name}</div>
                  {item.mrp > item.unitPrice && (
                    <div className="item-mrp-savings">MRP: {item.mrp.toFixed(2)}</div>
                  )}
                </td>
                <td className="col-qty">{item.quantity}</td>
                <td className="col-price">{item.unitPrice.toFixed(2)}</td>
                <td className="col-amount">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="divider-dashed"></div>

        {/* === TOTALS SECTION === */}
        <section className="totals-section">
          <div className="total-row">
            <span>Sub-Total ({billData.items?.length} Items)</span>
            <span>{billData.subtotal.toFixed(2)}</span>
          </div>
          {savings > 0 && (
            <div className="total-row discount">
              <span>Savings & Discount</span>
              <span>- {savings.toFixed(2)}</span>
            </div>
          )}
          {shopConfig.gstEnabled && (
            <>
              <div className="total-row">
                <span>CGST ({shopConfig.gstPercentage / 2}%)</span>
                <span>{calc.cgst.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>SGST ({shopConfig.gstPercentage / 2}%)</span>
                <span>{calc.sgst.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="divider-dashed"></div>
          <div className="total-row grand-total">
            <span>NET AMOUNT</span>
            <span className="grand-total-val">₹ {calc.total.toFixed(2)}</span>
          </div>
          <div className="divider-double"></div>
        </section>

        {/* === PAYMENT DETAILS SECTION === */}
        {(calc.paymentMode || billData.paymentMode || (calc.paymentModes && calc.paymentModes.length > 0) || (billData.paymentModes && billData.paymentModes.length > 0)) && (
          <section className="payment-details">
            <div className="payment-title">PAYMENT DETAILS</div>
            {/* Split Payment Mode */}
            {((calc.paymentMode === 'SPLIT' || billData.paymentMode === 'SPLIT') || (calc.paymentModes?.length > 0 || billData.paymentModes?.length > 0)) ? (
              <div className="split-payments">
                {(calc.paymentModes || billData.paymentModes || []).map((p, i) => (
                  <div key={i} className="payment-row">
                    <span>{p.mode}</span>
                    <span>₹ {p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Single Payment Mode */
              (calc.paymentMode || billData.paymentMode) && (
                <div className="payment-row">
                  <span>Mode: {calc.paymentMode || billData.paymentMode}</span>
                  <span>₹ {(calc.amountReceived || billData.amountReceived || calc.total).toFixed(2)}</span>
                </div>
              )
            )}
            
            <div className="divider-dashed"></div>
          </section>
        )}


        {/* === FOOTER SECTION === */}
        <footer className="receipt-footer">
          <div className="savings-highlight">
            {savings > 0 ? (
              <p>YOU SAVED ₹{savings.toFixed(2)} ON THIS BILL!</p>
            ) : (
              <p>THANK YOU FOR SHOPPING WITH US</p>
            )}
          </div>

          <div className="store-social">
            <p className="whatsapp-link">WhatsApp: {shopConfig.contact.whatsapp}</p>
            <p>{shopConfig.tagline}</p>
          </div>

          <div className="divider-dashed"></div>

          <div className="footer-message">
            <p className="thanks">{shopConfig.footerMessage}</p>
            <p className="copyright">Powered by {shopConfig.softwareBy || 'Khana Book'}</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ThermalReceipt;
