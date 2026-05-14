import React, { useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { deleteOrder, fetchOrders, getAdminToken, updateOrder } from '../../lib/api';

const ORDER_STATUSES = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const OrdersManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadOrders = async () => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchOrders(token);
      setOrders(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateField = async (orderId, patch) => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      const data = await updateOrder(orderId, patch, token);
      const updatedOrder = data.order;
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
    } catch (err) {
      setError(err.message || 'Unable to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const removeOrder = async (orderId) => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    if (!window.confirm('WARNING: This will TOTALLY REMOVE this order from the database. This action cannot be undone. Continue?')) {
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      await deleteOrder(orderId, token);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      setError(err.message || 'Unable to remove order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-cinzel text-perfume-gold tracking-widest">Orders Control</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mt-2">Track, update, and fulfill customer orders</p>
        </div>
        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 text-xs uppercase tracking-widest text-gray-300 hover:text-white hover:border-perfume-gold/30 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-[#0A0A0A]">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-black/50 border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-gray-400">
              <th className="p-4 font-normal">Order</th>
              <th className="p-4 font-normal">Customer</th>
              <th className="p-4 font-normal">Items</th>
              <th className="p-4 font-normal">Total</th>
              <th className="p-4 font-normal">Status</th>
              <th className="p-4 font-normal">Payment</th>
              <th className="p-4 font-normal">Created</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-xs text-perfume-gold tracking-widest uppercase animate-pulse">Loading orders...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-xs text-gray-500 tracking-widest uppercase">No orders yet</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors align-top">
                  <td className="p-4">
                    <p className="text-xs text-white tracking-wide">{order.order_number}</p>
                    <p className="text-[10px] text-gray-500 mt-1">#{order.id}</p>
                  </td>
                  <td className="p-4 text-xs text-gray-300">
                    <p className="text-white">{order.customer?.full_name || '-'}</p>
                    <p className="text-gray-500">{order.customer?.email || '-'}</p>
                  </td>
                  <td className="p-4 text-xs text-gray-300">
                    {(order.items || []).length === 0 ? (
                      <span className="text-gray-500">-</span>
                    ) : (
                      (order.items || []).map((item) => (
                        <div key={item.id} className="mb-1">
                          <span className="text-white">{item.product_name}</span> x {item.quantity}
                        </div>
                      ))
                    )}
                  </td>
                  <td className="p-4 text-sm text-perfume-gold font-medium">{order.total}</td>
                  <td className="p-4">
                    <select
                      value={order.status}
                      disabled={updatingOrderId === order.id}
                      onChange={(e) => updateField(order.id, { status: e.target.value })}
                      className="bg-black border border-white/10 text-xs text-white p-2 focus:outline-none"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <select
                      value={order.payment_status}
                      disabled={updatingOrderId === order.id}
                      onChange={(e) => updateField(order.id, { payment_status: e.target.value })}
                      className="bg-black border border-white/10 text-xs text-white p-2 focus:outline-none"
                    >
                      {PAYMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4 text-xs text-gray-400">{formatDate(order.created_at)}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => removeOrder(order.id)}
                      disabled={updatingOrderId === order.id}
                      className="text-gray-500 hover:text-red-500 transition-colors p-2"
                      title="Total Remove from Database"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersManager;
