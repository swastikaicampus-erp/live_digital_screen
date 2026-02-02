import React, { useState, useEffect } from 'react'; // 1. useEffect add kiya
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = 'http://76.13.192.122:5000';

// Icons Components (Same as before)
const UserIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
const MailIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>);
const LockIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
const ShopIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>);

function Signup() {
    const [step, setStep] = useState(1);
    const [plans, setPlans] = useState([]);
    const [isWaiting, setIsWaiting] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', email: '', password: '', shopName: '', phone: '',
        selectedPlan: '', planPrice: '',
        screens: 1,
        transactionId: '', paymentScreenshot: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLivePlans = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/plans`);
                setPlans(res.data);
                if (res.data.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        selectedPlan: res.data[0].duration,
                        planPrice: res.data[0].price
                    }));
                }
            } catch (err) {
                console.error("Plans fetch failed:", err);
            }
        };
        fetchLivePlans();
    }, []);

   const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, paymentScreenshot: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };
    // ... existing code (plans fetch wala useEffect) ...
    useEffect(() => {
        const fetchLivePlans = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/plans`);
                setPlans(res.data);
                // Pehla plan automatically select ho jaye
                if (res.data.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        selectedPlan: res.data[0].duration,
                        planPrice: res.data[0].price
                    }));
                }
            } catch (err) {
                console.error("Plans fetch failed:", err);
            }
        };
        fetchLivePlans();
    }, []);

    // 2. Status Polling Logic (Optimized)
    useEffect(() => {
        let interval;
        if (isWaiting) {
            interval = setInterval(async () => {
                try {
                    const user = auth.currentUser;
                    if (user) {
                        const token = await user.getIdToken(true); // Force refresh token
                        const res = await axios.get(`${BACKEND_URL}/api/users/status`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.data.status === 'active') {
                            clearInterval(interval);
                            navigate('/');
                        }
                    }
                } catch (err) {
                    console.error("Status check error:", err);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isWaiting, navigate]);
    const calculateTotal = (price, screens) => {
        return price * (screens || 1);
    };

   



    const handleFinalRegister = async (e) => {
        e.preventDefault();
        if (!formData.transactionId || !formData.paymentScreenshot) {
            alert("Please provide Transaction ID and Payment Screenshot");
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const token = await userCredential.user.getIdToken();

            await axios.post(`${BACKEND_URL}/api/users/register`, {
                uid: userCredential.user.uid,
                ...formData
            }, { headers: { 'Authorization': `Bearer ${token}` } });

            // alert hata kar waiting screen dikhayenge
            setIsWaiting(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isWaiting) {
        return (
            <div className="signup-container waiting-screen">
                <style>{`
                .waiting-screen {
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: #0f0c29;
                }
                .waiting-card {
                    width: 100%;
                    max-width: 450px;
                    padding: 40px 25px;
                    text-align: center;
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 28px;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
                    animation: fadeIn 0.8s ease-out;
                }
                .status-icon-box {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 25px;
                }
                .pulse-ring {
                    position: absolute;
                    inset: 0;
                    background: #667eea;
                    border-radius: 50%;
                    opacity: 0.2;
                    animation: statusPulse 2s infinite;
                }
                .status-emoji {
                    position: relative;
                    font-size: 40px;
                    line-height: 80px;
                }
                .waiting-title {
                    background: linear-gradient(to right, #fff, #a0aec0);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 12px;
                }
                .waiting-text {
                    color: #cbd5e0;
                    font-size: 15px;
                    line-height: 1.6;
                    margin-bottom: 25px;
                }
                .highlight-box {
                    background: rgba(102, 126, 234, 0.08);
                    border-radius: 16px;
                    padding: 18px;
                    margin-bottom: 25px;
                    border: 1px dashed rgba(102, 126, 234, 0.3);
                }
                .support-link {
                    display: block;
                    margin-top: 20px;
                    color: #667eea;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 500;
                    transition: 0.3s;
                }
                .support-link:hover {
                    color: #a3b1ff;
                    text-decoration: underline;
                }
                
                /* Mobile Adjustments */
                @media (max-width: 480px) {
                    .waiting-card {
                        padding: 35px 20px;
                        border-radius: 20px;
                    }
                    .waiting-title {
                        font-size: 20px;
                    }
                    .waiting-text {
                        font-size: 14px;
                    }
                }

                @keyframes statusPulse {
                    0% { transform: scale(0.9); opacity: 0.6; }
                    100% { transform: scale(1.6); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

                <div className="waiting-card">
                    <div className="status-icon-box">
                        <div className="pulse-ring"></div>
                        <div className="status-emoji">⏳</div>
                    </div>

                    <h2 className="waiting-title">Registration Successful!</h2>

                    <div className="waiting-text">
                        <p>Your account is currently under review.</p>

                        <div className="highlight-box">
                            <p style={{ margin: 0, fontSize: '14px', color: '#a3b1ff', fontWeight: '500' }}>
                                Next Step: Our team will verify your payment and activate your account within 24 hours.
                            </p>
                        </div>

                        <p style={{ fontSize: '12px', opacity: 0.6, maxWidth: '280px', margin: '0 auto' }}>
                            You will receive an email confirmation once your access is granted.
                        </p>
                    </div>

                    <button
                        className="btn-primary"
                        style={{ width: '100%', padding: '14px' }}
                        onClick={() => navigate('/')}
                    >
                        Return to Login
                    </button>

                    <a href="mailto:support@yourdomain.com" className="support-link">
                        Need help? Contact Support
                    </a>
                </div>
            </div>
        );
    }
    return (

        <div className="signup-container">

            <style>{`
                /* ... Saari CSS same rahegi jo aapne di thi ... */
                .signup-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f0c29; font-family: 'Inter', sans-serif; color: white; padding: 20px; box-sizing: border-box; }
                .signup-card { display: flex; width: 100%; max-width: 950px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .visual-side { flex: 0.8; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; justify-content: center; }
                .form-side { flex: 1.2; padding: 40px; background: rgba(0,0,0,0.3); overflow-y: auto; max-height: 90vh; }
                .input-group { position: relative; margin-bottom: 15px; }
                .input-icon { position: absolute; left: 15px; top: 12px; }
                .custom-input { width: 100%; padding: 12px 12px 12px 45px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; outline: none; box-sizing: border-box; font-size: 16px; }
                .custom-input:focus { border-color: #667eea; background: rgba(255,255,255,0.15); }
                .btn-primary { width: 100%; padding: 15px; background: #667eea; border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer; transition: 0.3s; margin-top: 10px; font-size: 16px; }
                .btn-primary:hover:not(:disabled) { background: #764ba2; transform: translateY(-2px); }
                .btn-primary:disabled { background: #4a5568; cursor: not-allowed; }
                .plan-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 20px 0; }
                .plan-card { padding: 15px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; text-align: center; transition: 0.2s; }
                .plan-card.active { border-color: #667eea; background: rgba(102, 126, 234, 0.2); box-shadow: 0 0 15px rgba(102, 126, 234, 0.3); }
                .qr-box { background: white; padding: 10px; border-radius: 12px; display: inline-block; margin-top: 10px; }
                .qr-box img { display: block; max-width: 130px; height: auto; }
                .upload-label { display: block; text-align: left; font-size: 13px; color: #a0aec0; margin-top: 15px; margin-bottom: 5px; }
                @media (max-width: 850px) { .signup-card { flex-direction: column; } .form-side { padding: 30px 20px; max-height: unset; } .plan-grid { grid-template-columns: 1fr; } }
            `}</style>


            <div className="signup-card">
                <div className="visual-side">
                    <img src="/goldberry_tech.png" alt="Logo" style={{ width: "200px", }} />

                    <h1>Join<br />The Network.</h1>
                    <p>Register your business and start managing your digital signage screens effortlessly.</p>
                </div>

                <div className="form-side">
                    {step === 1 ? (
                        <div className="fade-in">
                            <h2>Business Details</h2>
                            <div className="input-group">
                                <span className="input-icon"><UserIcon /></span>
                                <input type="text" name="fullName" className="custom-input" placeholder="Owner Full Name" onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <span className="input-icon"><ShopIcon /></span>
                                <input type="text" name="shopName" className="custom-input" placeholder="Shop / Business Name" onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <span className="input-icon"><MailIcon /></span>
                                <input type="email" name="email" className="custom-input" placeholder="Email Address" onChange={handleChange} required />
                            </div>
                            <div className="input-group">
                                <span className="input-icon"><LockIcon /></span>
                                <input type="password" name="password" className="custom-input" placeholder="Create Password" onChange={handleChange} required />
                            </div>
                            <button className="btn-primary" onClick={() => setStep(2)}>Next: Select Plan</button>
                        </div>
                    ) : (
                        <div className="fade-in" style={{ textAlign: 'center' }}>
                            <h2>Choose a Plan</h2>
                            <div className="plan-grid">
                                {plans.length > 0 ? (
                                    plans.slice(0, 3).map(p => (
                                        <div
                                            key={p._id}
                                            className={`plan-card ${formData.planPrice === p.price ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, selectedPlan: p.duration, planPrice: p.price })}
                                            style={{ position: 'relative', overflow: 'hidden' }} // Layout help
                                        >
                                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.name}</div>

                                            {/* Price Section */}
                                            <div style={{ margin: '5px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                {/* Ye purani price hai jo kat kar dikhegi */}
                                                {p.originalPrice && (
                                                    <span style={{
                                                        textDecoration: 'line-through',
                                                        fontSize: '11px',
                                                        color: '#fb7185', // Reddish color for strike
                                                        opacity: 0.8
                                                    }}>
                                                        ₹{p.originalPrice}
                                                    </span>
                                                )}

                                                {/* Ye nayi actual price hai */}
                                                <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '18px' }}>
                                                    ₹{p.price}
                                                </div>
                                            </div>

                                            <div style={{ fontSize: '11px', opacity: 0.6 }}>{p.duration} Months</div>

                                            {/* Optional: Discount Badge */}
                                            {p.originalPrice && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '5px',
                                                    right: '-15px',
                                                    background: '#48bb78',
                                                    color: 'white',
                                                    fontSize: '8px',
                                                    padding: '2px 15px',
                                                    transform: 'rotate(45deg)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    OFF
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ gridColumn: '1/-1', color: '#a0aec0' }}>Loading plans...</p>
                                )}
                            </div>
                            <div style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                                <label className="upload-label" style={{ marginTop: 0 }}>Number of Screens</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <input
                                        type="number"
                                        name="screens"
                                        min="1"
                                        max="50"
                                        value={formData.screens}
                                        className="custom-input"
                                        style={{ paddingLeft: '15px', width: '100px' }}
                                        onChange={handleChange}
                                    />
                                    <span style={{ fontSize: '13px', color: '#a0aec0' }}>
                                        Enter how many screens you want to manage.
                                    </span>
                                </div>
                            </div>

                           <div style={{ marginTop: '20px', padding: '15px',  borderRadius: '12px',  }}>
    <p style={{ fontSize: '15px', marginBottom: '10px' }}>
        Total Amount: <span style={{ color: '#667eea', fontWeight: 'bold', fontSize: '18px' }}>
            ₹{calculateTotal(formData.planPrice, formData.screens)}
        </span>
    </p>
    
    <div className="qr-box">
        {/* Yahan aap dynamic QR generate bhi kar sakte hain payment apps ke liye */}
        <img src="/qr.png" alt="QR Code for Payment" />
    </div>
    
    <p style={{ fontSize: '13px', marginTop: '10px', color: '#cbd5e0' }}>
        <strong style={{ color: 'white' }}>UPI ID:</strong> 7583077651@pthdfc
    </p>
    <p style={{ fontSize: '11px', color: '#a0aec0', fontStyle: 'italic' }}>
        *Please pay the exact amount for faster verification.
    </p>
</div>

                            <div style={{ marginTop: '20px' }}>
                                <label className="upload-label">Transaction ID / UTR Number</label>
                                <input type="number" name="transactionId" className="custom-input" placeholder="Enter 12-digit ID" onChange={handleChange} style={{ paddingLeft: '15px' }} />

                                <label className="upload-label">Upload Screenshot</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ fontSize: '12px', color: '#a0aec0' }} />
                            </div>

                            <button className="btn-primary" onClick={handleFinalRegister} disabled={loading || !formData.transactionId || !formData.paymentScreenshot}>
                                {loading ? "Processing..." : "Complete Registration"}
                            </button>
                            <p onClick={() => setStep(1)} style={{ marginTop: '15px', cursor: 'pointer', fontSize: '14px', color: '#667eea' }}>← Back</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Signup;