import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { 
  FaCalendarCheck, FaClock, FaCheckCircle, FaRupeeSign, 
  FaUsers, FaArrowUp, FaArrowDown, FaUser, FaCar 
} from 'react-icons/fa';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { getDaysInMonth, format } from 'date-fns';
import { Link } from 'react-router-dom';

// --- Components ---

const StatsCard = ({ title, value, icon, color, trend }) => (
  <div className="relative flex flex-col p-6 overflow-hidden transition-colors duration-300 border shadow-lg bg-taxi-dark rounded-xl border-taxi-gray group hover:border-taxi-yellow">
    <div className="z-10 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">{title}</p>
        <h3 className="mt-2 text-3xl font-bold text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-opacity-10 ${color.bg} ${color.text} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
        {icon}
      </div>
    </div>
    {trend && (
      <div className="z-10 flex items-center mt-4 text-xs font-medium">
        <span className={`${trend > 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
          {trend > 0 ? <FaArrowUp className="mr-1"/> : <FaArrowDown className="mr-1"/>}
          {Math.abs(trend)}%
        </span>
        <span className="ml-2 text-gray-500">vs last week</span>
      </div>
    )}
    <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 ${color.bg} blur-2xl group-hover:opacity-10 transition-opacity duration-500`}></div>
  </div>
);

const Dashboard = () => {
  // State for raw data
  const [allBookings, setAllBookings] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  
  // --- INDEPENDENT FILTERS ---
  const [monthlyViewYear, setMonthlyViewYear] = useState(new Date().getFullYear());
  const [monthlyViewMonth, setMonthlyViewMonth] = useState(new Date().getMonth()); // 0-11
  const [yearlyViewYear, setYearlyViewYear] = useState(new Date().getFullYear());

  // State for Derived Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);

  // State for Chart Data
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const [yearlyChartData, setYearlyChartData] = useState([]);

  // Helper to format dates safely
  const formatSafeDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'dd MMM yyyy');
  };

  // 1. Fetch Real-time Data
  useEffect(() => {
    const qBookings = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        // Determine Date Object (Preference: date > createdAt)
        let dateObj = new Date();
        if (d.date) {
           dateObj = d.date.toDate ? d.date.toDate() : new Date(d.date);
        } else if (d.createdAt) {
           dateObj = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
        }

        const finalPrice = Number(d.totalCost || d.cost || d.price || 0);
        return { id: doc.id, ...d, dateObj, finalPrice };
      });
      setAllBookings(data); 
    });

    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5)); 
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setRecentUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, () => {
        const qUsersFallback = query(collection(db, "users"), limit(5));
        onSnapshot(qUsersFallback, (snap) => setRecentUsers(snap.docs.map(doc => ({id: doc.id, ...doc.data()}))));
    });

    return () => { unsubscribeBookings(); unsubscribeUsers(); };
  }, []);

  // 2. Process Data when Bookings or Filters change
  useEffect(() => {
    if (allBookings.length === 0) return;

    // --- A. General Stats ---
    const newStats = allBookings.reduce((acc, curr) => {
      acc.total++;
      if (curr.status === 'pending' || curr.status === 'yet to confirm') acc.pending++;
      if (curr.status === 'confirmed') acc.confirmed++;
      if (curr.status === 'completed') {
        acc.completed++;
        acc.revenue += (curr.finalPrice || 0);
      }
      return acc;
    }, { total: 0, pending: 0, confirmed: 0, completed: 0, revenue: 0 });

    setStats(newStats);
    setRecentBookings(allBookings.slice(0, 5));

    // --- B. Status Pie Chart ---
    const pieData = [
      { name: 'Completed', value: newStats.completed, color: '#22c55e' },
      { name: 'Confirmed', value: newStats.confirmed, color: '#3b82f6' },
      { name: 'Pending', value: newStats.pending, color: '#eab308' },
      { name: 'Cancelled', value: allBookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' },
    ].filter(d => d.value > 0);
    setStatusData(pieData);

    // --- C. Vehicle Chart ---
    const vCounts = {};
    allBookings.forEach(b => {
      let type = b.vehicleType || "Unknown";
      type = type.charAt(0).toUpperCase() + type.slice(1);
      vCounts[type] = (vCounts[type] || 0) + 1;
    });
    setVehicleData(Object.keys(vCounts).map(k => ({ name: k, count: vCounts[k] })).sort((a,b) => b.count - a.count));

    // --- D. YEARLY CHART DATA (Jan - Dec) ---
    const yearlyMap = Array.from({ length: 12 }, () => ({ revenue: 0, pending: 0 }));
    
    allBookings.forEach(b => {
      if (b.dateObj.getFullYear() === parseInt(yearlyViewYear)) {
        const monthIndex = b.dateObj.getMonth();
        if (b.status === 'completed') {
          yearlyMap[monthIndex].revenue += b.finalPrice;
        } else if (['pending', 'confirmed', 'yet to confirm'].includes(b.status)) {
          yearlyMap[monthIndex].pending += b.finalPrice;
        }
      }
    });
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    setYearlyChartData(yearlyMap.map((data, index) => ({ 
      name: months[index], 
      revenue: data.revenue, 
      pending: data.pending 
    })));

    // --- E. MONTHLY CHART DATA (Day 1 - 30/31) ---
    const daysInMonth = getDaysInMonth(new Date(monthlyViewYear, monthlyViewMonth));
    const monthlyMap = Array.from({ length: daysInMonth }, () => ({ revenue: 0, pending: 0 }));
    
    allBookings.forEach(b => {
      if (b.dateObj.getFullYear() === parseInt(monthlyViewYear) && 
          b.dateObj.getMonth() === parseInt(monthlyViewMonth)) {
        const day = b.dateObj.getDate() - 1; // 0-indexed
        
        if (b.status === 'completed') {
          monthlyMap[day].revenue += b.finalPrice;
        } else if (['pending', 'confirmed', 'yet to confirm'].includes(b.status)) {
          monthlyMap[day].pending += b.finalPrice;
        }
      }
    });
    setMonthlyChartData(monthlyMap.map((data, index) => ({ 
      day: index + 1, 
      revenue: data.revenue, 
      pending: data.pending 
    })));

  }, [allBookings, monthlyViewYear, monthlyViewMonth, yearlyViewYear]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i); 

  return (
    <div className="pb-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="mt-1 text-gray-400">Overview of your taxi dispatch operations.</p>
        </div>
      </div>
      
      {/* 1. Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bookings" value={stats.total} icon={<FaCalendarCheck size={24}/>} color={{ bg: 'bg-blue-600', text: 'text-blue-500' }} trend={12} />
        <StatsCard title="Confirmed" value={stats.confirmed} icon={<FaCheckCircle size={24}/>} color={{ bg: 'bg-indigo-500', text: 'text-indigo-500' }} trend={5} />
        <StatsCard title="Pending" value={stats.pending} icon={<FaClock size={24}/>} color={{ bg: 'bg-yellow-500', text: 'text-yellow-500' }} trend={-2} />
        <StatsCard title="Revenue" value={`₹${(stats.revenue || 0).toLocaleString()}`} icon={<FaRupeeSign size={24}/>} color={{ bg: 'bg-taxi-yellow', text: 'text-taxi-yellow' }} trend={15} />
      </div>

      {/* 2. REVENUE CHARTS SECTION */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* CHART 1: MONTHLY BREAKDOWN */}
        <div className="p-6 border shadow-lg bg-taxi-dark rounded-xl border-taxi-gray">
          <div className="flex flex-col justify-between mb-6 md:flex-row md:items-center">
            <h3 className="flex items-center text-sm font-bold tracking-wider text-white uppercase">
              <FaRupeeSign className="mr-2 text-taxi-yellow"/> Daily Financial Overview
            </h3>
            <div className="flex gap-2 mt-2 md:mt-0">
               <select 
                 value={monthlyViewMonth} 
                 onChange={(e) => setMonthlyViewMonth(e.target.value)}
                 className="px-3 py-1.5 text-xs text-white rounded outline-none bg-black/50 border border-taxi-gray focus:border-taxi-yellow cursor-pointer"
               >
                 {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
               </select>
               <select 
                 value={monthlyViewYear} 
                 onChange={(e) => setMonthlyViewYear(e.target.value)}
                 className="px-3 py-1.5 text-xs text-white rounded outline-none bg-black/50 border border-taxi-gray focus:border-taxi-yellow cursor-pointer"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          </div>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFC107" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFC107" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="day" stroke="#666" tick={{fill: '#999', fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{fill: '#999', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                  labelFormatter={(label) => `Day ${label}`}
                  formatter={(value, name) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Completed Rev.' : 'Pending Amt.']}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                <Area type="monotone" dataKey="revenue" name="revenue" stroke="#FFC107" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="pending" name="pending" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPending)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: YEARLY BREAKDOWN */}
        <div className="p-6 border shadow-lg bg-taxi-dark rounded-xl border-taxi-gray">
          <div className="flex flex-col justify-between mb-6 md:flex-row md:items-center">
            <h3 className="flex items-center text-sm font-bold tracking-wider text-white uppercase">
              <FaRupeeSign className="mr-2 text-blue-400"/> Monthly Financial Overview
            </h3>
            <div className="mt-2 md:mt-0">
               <select 
                 value={yearlyViewYear} 
                 onChange={(e) => setYearlyViewYear(e.target.value)}
                 className="px-3 py-1.5 text-xs text-white rounded outline-none bg-black/50 border border-taxi-gray focus:border-taxi-yellow cursor-pointer"
               >
                 {years.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
            </div>
          </div>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#666" tick={{fill: '#999', fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis stroke="#666" tick={{fill: '#999', fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                  cursor={{fill: '#ffffff0a'}}
                  formatter={(value, name) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Completed Rev.' : 'Pending Amt.']}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                <Bar dataKey="revenue" name="revenue" fill="#FFC107" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="pending" name="pending" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Secondary Metrics (Cars & Pie) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vehicle Stats */}
        <div className="p-6 border shadow-lg bg-taxi-dark rounded-xl border-taxi-gray">
          <h3 className="flex items-center mb-6 text-sm font-bold tracking-wider text-white uppercase">
            <FaCar className="mr-2 text-indigo-400"/> Cars Booked (All Time)
          </h3>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#666" tick={{fill: '#999', fontSize: 10}} hide />
                <YAxis type="category" dataKey="name" stroke="#666" tick={{fill: '#ccc', fontSize: 11}} width={80} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}/>
                <Bar dataKey="count" fill="#818CF8" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#fff', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Status Pie */}
        <div className="flex flex-col p-6 border shadow-lg bg-taxi-dark rounded-xl border-taxi-gray">
          <h3 className="mb-2 text-sm font-bold tracking-wider text-white uppercase">Status Overview</h3>
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="block text-2xl font-bold text-white">{stats.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Recent Bookings & Users */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Bookings Table */}
        <div className="overflow-hidden border shadow-lg lg:col-span-2 bg-taxi-dark rounded-xl border-taxi-gray">
          <div className="flex items-center justify-between p-6 border-b border-taxi-gray">
            <h3 className="text-xl font-bold text-white">Recent Bookings</h3>
            <Link to="/bookings" className="text-sm text-taxi-yellow hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-gray-400 uppercase bg-black/50">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">S.No</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Customer</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Route</th>
                  {/* Added Date Column Header */}
                  <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Price</th>
                </tr>
              </thead>
              <tbody className="text-gray-300 divide-y divide-taxi-gray/50">
                {recentBookings.map((booking, index) => (
                  <tr key={booking.id} className="transition-colors hover:bg-white/5 group">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{booking.name || booking.userName || 'Guest'}</div>
                      <a href={`tel:${booking.phone?.replace(/\D/g, '')}`} className="text-xs text-gray-500 transition-colors hover:text-taxi-yellow">
                        {booking.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center"><span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span> {booking.source?.displayName || booking.pickupLocation || 'N/A'}</div>
                      <div className="h-3 my-1 ml-1 border-l border-gray-600 border-dashed"></div>
                      <div className="flex items-center"><span className="w-2 h-2 mr-2 bg-red-500 rounded-full"></span> {booking.destination?.displayName || booking.dropLocation || 'N/A'}</div>
                    </td>
                    
                    {/* Added Date Column Data */}
                    <td className="px-6 py-4 text-xs">
                        <div className="text-white"><span className="text-gray-500">Trip:</span> {formatSafeDate(booking.date)}</div>
                        <div className="mt-1 text-gray-500"><span className="text-gray-600">Booked:</span> {formatSafeDate(booking.createdAt)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${booking.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          booking.status === 'confirmed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                          (booking.status === 'pending' || booking.status === 'yet to confirm') ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          booking.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                        }`}>
                        {booking.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-right text-taxi-yellow">
                      ₹{(booking.finalPrice || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentBookings.length === 0 && (
              <div className="p-8 text-center text-gray-500">No recent bookings found.</div>
            )}
          </div>
        </div>

        {/* New Users Widget */}
        <div className="p-6 border shadow-lg bg-taxi-dark rounded-xl border-taxi-gray">
          <h3 className="flex items-center justify-between mb-4 text-lg font-bold text-white">
            <span>New Users</span>
            <span className="px-2 py-1 text-xs font-normal text-gray-400 rounded bg-white/5">Recently Joined</span>
          </h3>
          
          <div className="flex items-center justify-between p-4 mb-8 border rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent border-blue-500/20">
            <div>
              <p className="text-sm text-gray-400">Recent Signups</p>
              <p className="text-3xl font-bold text-white">{recentUsers.length}<span className="text-lg">+</span></p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 text-white bg-blue-500 rounded-full">
              <FaUsers size={24} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">Latest Users</h4>
            {recentUsers.map((user, i) => (
              <div key={user.id || i} className="flex items-center justify-between p-2 transition-colors rounded cursor-pointer group hover:bg-white/5">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 overflow-hidden text-xs font-bold text-white bg-gray-700 border border-gray-600 rounded-full">
                    {user.photoURL ? <img src={user.photoURL} alt="user" className="object-cover w-full h-full"/> : <FaUser />}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white transition-colors group-hover:text-blue-400">
                      {user.name || user.email || 'Anonymous'}
                    </p>
                    <p className="w-32 text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="py-4 text-sm text-center text-gray-500">No users found.</p>}
            <Link to="/users" className="block w-full py-2 mt-4 text-sm text-center text-gray-400 transition-all border border-gray-600 border-dashed rounded hover:border-blue-500 hover:text-blue-500">
              View All Users
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;