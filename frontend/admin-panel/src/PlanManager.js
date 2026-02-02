import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = 'http://76.13.192.122:5000';

function PlanManager() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: '', duration: '', price: '', originalPrice: '' });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/plans`);
            setPlans(res.data);
        } catch (err) {
            console.error("Fetch Error:", err.message);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        
        // Strictly allow only 3 plans
        if (plans.length >= 3) {
            alert("Limit reached! You can only have 3 active plans. Delete one to add a new one.");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${BACKEND_URL}/api/plans/add`, newPlan);
            setNewPlan({ name: '', duration: '', price: '', originalPrice: '' });
            fetchPlans();
            alert("Plan added successfully!");
        } catch (err) {
            alert("Error adding plan: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this plan?")) {
            try {
                await axios.delete(`${BACKEND_URL}/api/plans/delete/${id}`);
                fetchPlans();
            } catch (err) {
                alert("Delete failed");
            }
        }
    };

    return (
        <div className="admin-container">
            <style>{`
                .admin-container { background: #0f0c29; min-height: 100vh; padding: 40px 20px; font-family: 'Inter', sans-serif; color: white; }
                .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); padding: 30px; max-width: 900px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; }
                .limit-badge { background: ${plans.length >= 3 ? '#f56565' : '#48bb78'}; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px; }
                .admin-input { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; color: white; outline: none; transition: 0.3s; }
                .admin-input:focus { border-color: #667eea; background: rgba(255,255,255,0.12); }
                .btn-add { background: #667eea; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s; width: 100%; }
                .btn-add:hover:not(:disabled) { background: #764ba2; transform: translateY(-2px); }
                .btn-add:disabled { background: #4a5568; cursor: not-allowed; opacity: 0.7; }
                .plan-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .plan-table th { text-align: left; padding: 15px; background: rgba(102, 126, 234, 0.15); color: #a0aec0; font-size: 13px; text-transform: uppercase; }
                .plan-table td { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .price-tag { color: #48bb78; font-weight: bold; font-size: 16px; }
                .old-price { text-decoration: line-through; color: #718096; font-size: 12px; margin-right: 8px; }
                .btn-delete { background: rgba(245, 101, 101, 0.15); color: #f56565; border: 1px solid rgba(245, 101, 101, 0.3); padding: 6px 15px; border-radius: 6px; cursor: pointer; transition: 0.3s; }
                .btn-delete:hover { background: #f56565; color: white; }
                .empty-msg { text-align: center; padding: 40px; color: #718096; }
            `}</style>

            <div className="glass-card">
                <div className="admin-header">
                    <div>
                        <h2 style={{ margin: 0 }}>💎 Manage Plans</h2>
                        <p style={{ color: '#a0aec0', fontSize: '14px', margin: '5px 0 0 0' }}>Showcase exactly 3 plans on your signup page</p>
                    </div>
                    <span className="limit-badge">
                        {plans.length} / 3 Plans Used
                    </span>
                </div>

                {/* Form to Add Plans */}
                <form onSubmit={handleAdd} style={{ marginBottom: '40px' }}>
                    <div className="form-grid">
                        <input className="admin-input" placeholder="Plan Name (e.g. Starter)" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} required />
                        <input className="admin-input" type="number" placeholder="Months (e.g. 3)" value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: e.target.value})} required />
                        <input className="admin-input" type="number" placeholder="Real Price (₹)" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} required />
                        <input className="admin-input" type="number" placeholder="Original Price (Strikethrough)" value={newPlan.originalPrice} onChange={e => setNewPlan({...newPlan, originalPrice: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-add" disabled={loading || plans.length >= 3}>
                        {plans.length >= 3 ? 'Max 3 Plans Reached' : (loading ? 'Creating...' : '+ Create New Plan')}
                    </button>
                </form>

                {/* Table to Display Plans */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="plan-table">
                        <thead>
                            <tr>
                                <th>Plan Details</th>
                                <th>Duration</th>
                                <th>Pricing</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.length > 0 ? (
                                plans.slice(0, 3).map(p => (
                                    <tr key={p._id}>
                                        <td style={{ fontWeight: '500' }}>{p.name}</td>
                                        <td>{p.duration} Months</td>
                                        <td>
                                            {p.originalPrice && <span className="old-price">₹{p.originalPrice}</span>}
                                            <span className="price-tag">₹{p.price}</span>
                                        </td>
                                        <td>
                                            <button className="btn-delete" onClick={() => handleDelete(p._id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="empty-msg">No plans added yet. Create your first plan above.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default PlanManager;