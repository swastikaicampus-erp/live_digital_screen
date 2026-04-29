import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { manualSignIn, auth } from './firebase';
import axios from 'axios'; // 1. Axios import kiya

const BACKEND_URL = 'https://my-signage-backend.onrender.com';

const MailIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>);
const LockIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // 1. Pehle Firebase se sirf Credentials lijiye (Sign in kijiye)
        const userCredential = await manualSignIn(email, password);
        const user = userCredential.user;
        const token = await user.getIdToken();

        // 2. Dashboard pe bhejne se PEHLE Backend status check karein
        const response = await axios.get(`${BACKEND_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const userData = response.data;

        // 3. Status Check: Agar active nahi hai toh yahin rok do
        if (userData.status !== 'active') {
            // Turant logout karo taaki koi session na bache
            await auth.signOut(); 
            setError("Account Suspended.");
            setLoading(false);
            return; // Function ko yahin rok dein, navigate na hone dein
        }

        // 4. Sab sahi hai, ab redirect karein
        navigate('/');

    } catch (err) {
        console.error("Login Error:", err);
        
        // Agar backend error deta hai ya status non-active hai
        if (auth.currentUser) await auth.signOut();

        if (err.response && err.response.status === 403) {
            setError("Access Denied: Aapka account suspended hai.");
        } else if (err.response && err.response.status === 404) {
            setError("User record not found. Please register first.");
        } else {
            setError("Invalid credentials or account restricted.");
        }
    } finally {
        setLoading(false);
    }
};
    return (
        <div className="login-container">
            <style>{`
                .login-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f0c29; font-family: 'Inter', sans-serif; color: white; padding: 20px; }
                .login-card { display: flex; width: 100%; max-width: 850px; background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(15px); border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .visual-side { flex: 1; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; justify-content: center; }
                .form-side { flex: 1; padding: 50px; background: rgba(0,0,0,0.3); }
                .input-group { position: relative; margin-bottom: 20px; }
                .input-icon { position: absolute; left: 15px; top: 15px; }
                .custom-input { width: 100%; padding: 15px 15px 15px 45px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: white; outline: none; box-sizing: border-box; font-size: 16px; }
                .custom-input:focus { border-color: #667eea; background: rgba(255,255,255,0.15); }
                .btn-primary { width: 100%; padding: 15px; background: #667eea; border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer; transition: 0.3s; font-size: 16px; }
                .btn-primary:hover:not(:disabled) { background: #764ba2; transform: translateY(-2px); }
                .btn-primary:disabled { background: #4a5568; opacity: 0.7; cursor: not-allowed; }
                .error-msg { background: rgba(255, 138, 138, 0.1); border: 1px solid #ff8a8a; color: #ff8a8a; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 13px; line-height: 1.4; }
                @media (max-width: 768px) { .login-card { flex-direction: column; max-width: 450px; } .visual-side { padding: 30px;  } .form-side { padding: 30px 20px; } }
            `}</style>

            <div className="login-card">
                <div className="visual-side">
                    <img src="/goldberry_tech.png" alt="Logo" style={{ width: "200px" }} />
                    <h1>Secure Access.</h1>
                    <p>Only authorized users can manage their digital signage screens.</p>
                </div>
                <div className="form-side">
                    <h2>Admin Login</h2>
                    {error && <div className="error-msg">{error}</div>}
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <span className="input-icon"><MailIcon /></span>
                            <input
                                type="email"
                                className="custom-input"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <span className="input-icon"><LockIcon /></span>
                            <input
                                type="password"
                                className="custom-input"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? "Verifying..." : "Sign In"}
                        </button>
                        <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                            Don't have an account?
                            <Link to="/Signup" style={{ color: '#667eea', marginLeft: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                                Register Now
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;