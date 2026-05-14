import React, { useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, UserPlus, X, ShoppingBag } from 'lucide-react';
import {
  createCustomer,
  deleteCustomer,
  deleteOrder,
  fetchCustomers,
  getAdminToken,
  updateCustomer,
} from '../../lib/api';

const EMPTY_CUSTOMER = {
  full_name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  country: 'India',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const CustomersManager = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [editingId, setEditingId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingOrdersId, setViewingOrdersId] = useState(null);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const loadCustomers = async () => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await fetchCustomers(token);
      setCustomers(data || []);
    } catch (err) {
      setError(err.message || 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_CUSTOMER);
    setIsFormOpen(false);
    setSaving(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_CUSTOMER);
    setIsFormOpen(true);
    setError('');
  };

  const openEditForm = (customer) => {
    setEditingId(customer.id);
    setForm({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
    });
    setIsFormOpen(true);
    setError('');
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (isEditing) {
        await updateCustomer(editingId, form, token);
      } else {
        await createCustomer(form, token);
      }
      await loadCustomers();
      resetForm();
    } catch (err) {
      setError(err.message || 'Unable to save customer');
    } finally {
      setSaving(false);
    }
  };

  const removeCustomer = async (customerId) => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    if (!window.confirm('Delete this customer?')) {
      return;
    }

    try {
      await deleteCustomer(customerId, token);
      await loadCustomers();
    } catch (err) {
      setError(err.message || 'Unable to delete customer');
    }
  };

  const removeOrder = async (customerId, orderId) => {
    const token = getAdminToken();
    if (!token) {
      setError('Admin session expired. Please login again.');
      return;
    }

    if (!window.confirm('WARNING: This will TOTALLY REMOVE this order from the database. This action cannot be undone. Continue?')) {
      return;
    }

    try {
      await deleteOrder(orderId, token);
      setCustomers((prev) => 
        prev.map((c) => {
          if (c.id === customerId) {
            return {
              ...c,
              orders: c.orders.filter((o) => o.id !== orderId)
            };
          }
          return c;
        })
      );
    } catch (err) {
      setError(err.message || 'Unable to remove order');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-cinzel text-perfume-gold tracking-widest">Customer Vault</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.2em] uppercase mt-2">Manage customer profiles and contact details</p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-perfume-gold text-black text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
        >
          <UserPlus size={14} />
          Add Customer
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/40 text-red-400 text-sm">
          {error}
        </div>
      )}

      {isFormOpen && (
        <div className="bg-[#0A0A0A] border border-perfume-gold/20 p-6 rounded-md">
          <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
            <h3 className="text-xs tracking-widest uppercase text-perfume-gold">
              {isEditing ? 'Edit Customer' : 'Add Customer'}
            </h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'full_name', required: true },
              { label: 'Email', key: 'email', required: true, type: 'email' },
              { label: 'Phone', key: 'phone' },
              { label: 'City', key: 'city' },
              { label: 'State', key: 'state' },
              { label: 'Country', key: 'country' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-[9px] uppercase tracking-widest text-gray-500 mb-2">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  required={Boolean(field.required)}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full bg-black border border-white/10 p-3 text-xs focus:border-perfume-gold focus:outline-none"
                />
              </div>
            ))}

            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-white text-black text-[10px] tracking-widest uppercase font-bold disabled:opacity-60"
              >
                {saving ? 'Saving...' : isEditing ? 'Update Customer' : 'Create Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-[1.5rem] border border-white/5 bg-[#0A0A0A]">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-black/50 border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-gray-400">
              <th className="p-4 font-normal">Name</th>
              <th className="p-4 font-normal">Contact</th>
              <th className="p-4 font-normal">Location</th>
              <th className="p-4 font-normal">Orders</th>
              <th className="p-4 font-normal">Joined</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-xs text-perfume-gold tracking-widest uppercase animate-pulse">Loading customers...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-xs text-gray-500 tracking-widest uppercase">No customers found</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <React.Fragment key={customer.id}>
                  <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm text-white">{customer.full_name}</td>
                  <td className="p-4 text-xs text-gray-300">
                    <p>{customer.email}</p>
                    <p className="text-gray-500">{customer.phone || '-'}</p>
                  </td>
                  <td className="p-4 text-xs text-gray-300">
                    {[customer.city, customer.state, customer.country].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="p-4 text-xs">
                    <button 
                      onClick={() => setViewingOrdersId(viewingOrdersId === customer.id ? null : customer.id)}
                      className="text-perfume-gold hover:underline flex items-center gap-1"
                    >
                      <ShoppingBag size={12} />
                      {(customer.orders || []).length} Orders
                    </button>
                  </td>
                  <td className="p-4 text-xs text-gray-400">{formatDate(customer.created_at)}</td>
                  <td className="p-4">
                    <div className="flex justify-end items-center gap-3 text-gray-500">
                      <button onClick={() => openEditForm(customer)} className="hover:text-perfume-gold transition-colors" aria-label="Edit customer">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => removeCustomer(customer.id)} className="hover:text-red-500 transition-colors" aria-label="Delete customer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                {viewingOrdersId === customer.id && (
                  <tr className="bg-black/40 border-b border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <td colSpan="6" className="p-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-gray-500 mb-4 border-b border-white/5 pb-2">Purchase History</h4>
                        {(customer.orders || []).length === 0 ? (
                          <p className="text-xs text-gray-500 italic">No orders found for this customer</p>
                        ) : (
                          <div className="grid gap-3">
                            {customer.orders.map((order) => (
                              <div key={order.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:border-perfume-gold/20 transition-colors">
                                <div className="flex gap-6 items-center">
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Order Number</p>
                                    <p className="text-xs text-white font-medium">{order.order_number}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Status</p>
                                    <span className={`text-[9px] uppercase tracking-tighter px-2 py-0.5 rounded-full ${
                                      order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                                      order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                      'bg-perfume-gold/10 text-perfume-gold'
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total</p>
                                    <p className="text-xs text-perfume-gold font-bold">{order.total}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => removeOrder(customer.id, order.id)}
                                  className="text-gray-600 hover:text-red-500 transition-colors p-2"
                                  title="Total Remove from Database"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersManager;
