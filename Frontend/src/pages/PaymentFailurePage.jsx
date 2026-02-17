import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentFailurePage() {
  const q = useQuery();
  const orderId = q.get('orderId');
  const txnid = q.get('txnid');
  const status = q.get('status');
  const hashOk = q.get('hashOk');

  return (
    <div className="page-container" style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Payment Failed</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        The payment did not complete. You can retry from the Counter/Waiter billing screen.
      </p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }}>
        <div><strong>Status:</strong> {status || '-'}</div>
        <div><strong>Order ID:</strong> {orderId || '-'}</div>
        <div><strong>Txn ID:</strong> {txnid || '-'}</div>
        <div><strong>Hash verified:</strong> {hashOk === 'true' ? 'Yes' : 'No/Unknown'}</div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" to="/counter">Go to Counter</Link>
        <Link className="btn btn-outline" to="/">Go Home</Link>
      </div>
    </div>
  );
}

