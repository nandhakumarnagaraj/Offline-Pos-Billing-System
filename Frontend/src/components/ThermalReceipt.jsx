import React from 'react';
import './ThermalReceipt.css';

const ThermalReceipt = ({ billData, calc, storeName = "BIRYANIPOS RESTAURANT" }) => {
  if (!billData) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const time = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="thermal-receipt-wrap">
      <div className="thermal-receipt" id="thermal-receipt">
        <div className="receipt-header">
          <h1 className="store-name">{storeName}</h1>
          <p className="store-tagline">Delicious Hyderabadi Flavours</p>
          <p className="store-fssai">FSSAI: 12345678901234</p>
          <div className="receipt-divider">********************************</div>
        </div>

        <div className="receipt-info">
          <div className="info-row">
            <span>Date: {today}</span>
            <span>Time: {time}</span>
          </div>
          <div className="info-row">
            <span>Bill No: #{billData.orderId}</span>
            <span>Table: {billData.tableNumber || 'Takeaway'}</span>
          </div>
          {billData.customerName && (
            <div className="info-row">
              <span>Customer: {billData.customerName}</span>
            </div>
          )}
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-items">
          <div className="item-header">
            <span className="col-name">ITEM</span>
            <span className="col-qty">QTY</span>
            <span className="col-price">PRICE</span>
            <span className="col-total">TOTAL</span>
          </div>
          <div className="receipt-divider">--------------------------------</div>

          {billData.items?.map((item, idx) => (
            <div key={idx} className="item-row">
              <span className="col-name">{item.name}</span>
              <span className="col-qty">{item.quantity}</span>
              <span className="col-price">{item.unitPrice.toFixed(0)}</span>
              <span className="col-total">{item.total.toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="receipt-divider">--------------------------------</div>

        <div className="receipt-totals">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>₹{billData.subtotal.toFixed(2)}</span>
          </div>
          {calc.discount > 0 && (
            <div className="total-row">
              <span>Discount:</span>
              <span>-₹{calc.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="total-row">
            <span>CGST (2.5%):</span>
            <span>₹{calc.cgst.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>SGST (2.5%):</span>
            <span>₹{calc.sgst.toFixed(2)}</span>
          </div>
          <div className="receipt-divider">--------------------------------</div>
          <div className="total-row grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹{calc.total.toFixed(2)}</span>
          </div>
          <div className="receipt-divider">--------------------------------</div>

          {calc.change > 0 && (
            <>
              <div className="total-row">
                <span>Received:</span>
                <span>₹{(calc.total + calc.change).toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Change:</span>
                <span>₹{calc.change.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="receipt-footer">
          <p>Thank You! Visit Again</p>
          <p className="footer-small">For Feedback: +91 98765 43210</p>
          <div className="receipt-divider">********************************</div>
          <p className="software-credit">Powered by BiryaniPOS</p>
        </div>
      </div>
    </div>
  );
};

export default ThermalReceipt;
