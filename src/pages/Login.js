import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash, FaSpinner, FaCarSide, FaRoad, FaRoute, FaTaxi } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Custom CSS for floating animations
const animationStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
    33% { transform: translateY(-30px) translateX(20px) rotate(5deg); }
    66% { transform: translateY(20px) translateX(-20px) rotate(-5deg); }
  }
  .animate-float-slow { animation: float 20s infinite ease-in-out alternate; }
  .animate-float-medium { animation: float 14s infinite ease-in-out alternate; }
  .animate-float-fast { animation: float 10s infinite ease-in-out alternate; }
`;

// Background Component
const AnimatedBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden font-sans pointer-events-none">
    <style>{animationStyles}</style>
    {/* Dark Overlay & Subtle Yellow Radial Gradient */}
    <div className="absolute inset-0 bg-[#0a0a0a] opacity-90"></div>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-taxi-yellow/20 via-[#0a0a0a] to-[#0a0a0a]"></div>
    
    {/* Floating Icons - Brighter */}
    <FaTaxi className="absolute text-taxi-yellow/40 top-[15%] left-[10%] text-7xl animate-float-slow" />
    <FaCarSide className="absolute text-gray-600 opacity-30 bottom-[20%] right-[10%] text-8xl animate-float-medium" style={{ animationDelay: '-5s' }}/>
    <FaRoad className="absolute text-gray-500 opacity-25 top-[40%] right-[25%] text-9xl animate-float-slow" style={{ animationDelay: '-10s' }} />
    <FaRoute className="absolute text-taxi-yellow/40 bottom-[10%] left-[20%] text-6xl animate-float-fast" style={{ animationDelay: '-2s' }} />
  </div>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back, Admin!');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Failed to login. Check credentials.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-md p-8 border shadow-2xl bg-taxi-dark/80 backdrop-blur-md rounded-2xl border-taxi-gray">
        <div className="mb-6 overflow-hidden text-center"> {/* Added overflow-hidden to contain zoom */}
          {/* Logo Image: Shorter Height (h-16), Wider, and Zoomed (scale-150) */}
          <div className="flex items-center justify-center h-16">
             <img 
              src="/header.png" 
              alt="Pranav Drop Taxi Logo" 
              className="object-contain w-auto h-full max-w-full transform scale-150 animate-pulse" 
              style={{ animationDuration: '3s' }}
            />
          </div>
          
          <h2 className="mt-6 text-3xl font-bold text-white">Admin Login</h2>
          <p className="mt-2 text-gray-400">Pranav Drop Taxi Control Panel</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block mb-2 text-sm font-bold tracking-wider text-gray-400 uppercase">Email Address</label>
            <input
              type="email"
              required
              className="w-full p-3 text-white transition-all duration-300 border rounded-lg bg-black/50 border-taxi-gray focus:outline-none focus:border-taxi-yellow focus:ring-1 focus:ring-taxi-yellow"
              value={email}
              placeholder="admin@pranavtaxi.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input with Eye Toggle */}
          <div className="relative">
            <label className="block mb-2 text-sm font-bold tracking-wider text-gray-400 uppercase">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} // Toggle type
                required
                className="w-full p-3 pr-12 text-white transition-all duration-300 border rounded-lg bg-black/50 border-taxi-gray focus:outline-none focus:border-taxi-yellow focus:ring-1 focus:ring-taxi-yellow"
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-taxi-yellow focus:outline-none"
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button with Loading Spinner */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 font-bold text-black transition-all duration-300 rounded-lg bg-taxi-yellow hover:bg-yellow-400 hover:shadow-[0_0_15px_rgba(255,193,7,0.5)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
             {isLoading ? (
                <>
                  <FaSpinner className="mr-2 animate-spin" /> Signing In...
                </>
              ) : (
                'Sign In'
              )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;