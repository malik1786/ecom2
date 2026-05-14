import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('AUTHENTICATING'); // AUTHENTICATING, SUCCESS, ERROR

    useEffect(() => {
        console.log('🚀 [AUTH-SUCCESS] Route Hit');
        const params = new URLSearchParams(location.search);
        const token = params.get('token');

        if (token) {
            console.log('✅ [AUTH-SUCCESS] TOKEN EXTRACTED');
            try {
                // 1. Securely store the token
                localStorage.setItem('sufi-customer-token', token);
                
                // 2. Clear sensitive data from URL immediately
                window.history.replaceState({}, document.title, "/auth-success");
                
                setStatus('SUCCESS');
                console.log('📡 [AUTH-SUCCESS] AUTH STATE UPDATED');

                // 3. Dispatch event to notify NavBar to fetch user
                window.dispatchEvent(new Event('auth-updated'));

                // 4. Redirect to dashboard/home after a brief high-end transition
                setTimeout(() => {
                    console.log('🏠 [AUTH-SUCCESS] REDIRECTING TO HOME');
                    navigate('/', { replace: true });
                }, 2000);
            } catch (err) {
                console.error('❌ [AUTH-SUCCESS] STORAGE ERROR:', err);
                setStatus('ERROR');
            }
        } else {
            console.error('❌ [AUTH-SUCCESS] INVALID TOKEN OR MISSING PARAMS');
            setStatus('ERROR');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [location, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0D0D] text-white">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-8 max-w-md text-center p-12 bg-[#151515] border border-white/[0.05] rounded-[32px] shadow-2xl"
            >
                {status === 'AUTHENTICATING' && (
                    <>
                        <div className="relative w-20 h-20">
                            <motion.div 
                                className="absolute inset-0 border-2 border-[#D4AF37]/10 rounded-full"
                            />
                            <motion.div 
                                className="absolute inset-0 border-2 border-t-[#D4AF37] rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                            />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-[14px] uppercase tracking-[0.5em] text-[#F5D27A] font-medium">Authenticating</h2>
                            <p className="text-[11px] text-stone-500 uppercase tracking-widest leading-loose">Synchronizing your digital signature with the Maison...</p>
                        </div>
                    </>
                )}

                {status === 'SUCCESS' && (
                    <>
                        <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20"
                        >
                            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                        <div className="space-y-3">
                            <h2 className="text-[14px] uppercase tracking-[0.5em] text-emerald-400 font-medium">Access Granted</h2>
                            <p className="text-[11px] text-stone-500 uppercase tracking-widest leading-loose">Welcome back to The Legacy collection.</p>
                        </div>
                    </>
                )}

                {status === 'ERROR' && (
                    <>
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 text-red-400">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-[14px] uppercase tracking-[0.5em] text-red-400 font-medium">Verification Failed</h2>
                            <p className="text-[11px] text-stone-500 uppercase tracking-widest leading-loose">Returning to login portal...</p>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default AuthSuccess;
