import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "../firebase";
import { 
  FaClipboardList, 
  FaPrint, 
  FaCut, 
  FaBoxes, 
  FaCheckCircle,
  FaHourglassHalf,
  FaBox,
  FaExclamationTriangle,
  FaChartLine,
  FaTasks
} from 'react-icons/fa';
import { GiRolledCloth } from 'react-icons/gi';
import { MdTrendingUp, MdInventory } from 'react-icons/md';
import PrimaryBtn from '../Components/PrimaryBtn';

// Simple Stat Card Component with light pastel colors
const StatCard = ({ icon: Icon, title, value, unit, bgColor, iconBg, iconColor, textColor }) => (
  <div className={`${bgColor} rounded-lg p-6 border border-gray-200`}>
    <div className={`${iconBg} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
      <Icon className={`text-2xl ${iconColor}`} />
    </div>
    <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
    <h1 className={`${textColor} font-bold`}>
      {value.toLocaleString()} <span className="text-xl font-semibold text-gray-500">{unit}</span>
    </h1>
  </div>
);

// Progress Bar Component
const ProgressBar = ({ label, value, total, color, lightColor }) => {
  const percentage = total > 0 ? ((value / total) * 100) : 0;
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-700 text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{value}</span>
          <span className="text-sm text-gray-500">({percentage.toFixed(1)}%)</span>
        </div>
      </div>
      <div className={`w-full ${lightColor} rounded-full h-3`}>
        <div
          className={`${color} h-3 rounded-full transition-all duration-1000`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  // Job Statistics
  const [totalJobs, setTotalJobs] = useState(0);
  const [printingJobs, setPrintingJobs] = useState(0);
  const [punchingJobs, setPunchingJobs] = useState(0);
  const [slittingJobs, setSlittingJobs] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [pendingJobs, setPendingJobs] = useState(0);

  // Material Statistics
  const [rawPurchased, setRawPurchased] = useState(0);
  const [loCreated, setLoCreated] = useState(0);
  const [wipCreated, setWipCreated] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalWaste, setTotalWaste] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);

  // Material Requests
  const [pendingRequests, setPendingRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);

  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch Jobs Data
      const jobsSnapshot = await getDocs(collection(db, 'ordersTest'));
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setTotalJobs(jobs.length);
      setPrintingJobs(jobs.filter(j => j.jobStatus === 'Printing').length);
      setPunchingJobs(jobs.filter(j => j.jobStatus === 'Punching').length);
      setSlittingJobs(jobs.filter(j => j.jobStatus === 'Slitting').length);
      setCompletedJobs(jobs.filter(j => j.jobStatus === 'Completed').length);
      setPendingJobs(jobs.filter(j => j.jobStatus !== 'Completed').length);

      // Fetch Materials Data
      const materialsSnapshot = await getDocs(collection(db, 'materials'));
      const materials = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const rawMaterials = materials.filter(m => m.materialCategory === 'RAW');
      const loMaterials = materials.filter(m => m.materialCategory === 'LO');
      const wipMaterials = materials.filter(m => m.materialCategory === 'WIP');

      const totalRaw = rawMaterials.reduce((sum, m) => sum + (parseFloat(m.totalRunningMeter) || 0), 0);
      const totalLo = loMaterials.reduce((sum, m) => sum + (parseFloat(m.totalRunningMeter) || 0), 0);
      const totalWip = wipMaterials.reduce((sum, m) => sum + (parseFloat(m.totalRunningMeter) || 0), 0);
      const totalAvailableRaw = rawMaterials.reduce((sum, m) => sum + (parseFloat(m.availableRunningMeter) || 0), 0);
      const totalAvailableLo = loMaterials.reduce((sum, m) => sum + (parseFloat(m.availableRunningMeter) || 0), 0);
      const totalAvailableWip = wipMaterials.reduce((sum, m) => sum + (parseFloat(m.availableRunningMeter) || 0), 0);

      setRawPurchased(totalRaw);
      setLoCreated(totalLo);
      setWipCreated(totalWip);
      setTotalAvailable(totalAvailableRaw + totalAvailableLo + totalAvailableWip);

      // Fetch Material Transactions
      const transactionsSnapshot = await getDocs(collection(db, 'materialTransactions'));
      const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const usedTransactions = transactions.filter(t => t.transactionType === 'used');
      const wasteTransactions = transactions.filter(t => t.transactionType === 'waste');

      const totalUsedAmount = usedTransactions.reduce((sum, t) => sum + (parseFloat(t.runningMeter) || 0), 0);
      const totalWasteAmount = wasteTransactions.reduce((sum, t) => sum + (parseFloat(t.runningMeter) || 0), 0);

      setTotalUsed(totalUsedAmount);
      setTotalWaste(totalWasteAmount);

      // Fetch Material Requests
      const requestsSnapshot = await getDocs(collection(db, 'materialRequest'));
      const requests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setPendingRequests(requests.filter(r => r.requestStatus === 'Pending').length);
      setApprovedRequests(requests.filter(r => r.requestStatus === 'Approved').length);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (isMounted) {
        await fetchDashboardData();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-100 mx-auto mb-6"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-blue-600 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-gray-700 font-semibold text-lg">Loading Dashboard</p>
          <p className="text-gray-500 text-sm mt-1">Please wait...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-white">
      <div className=" mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="">Dashboard</h1>
          <hr className='my-4' />
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Label printing production and inventory overview</p>
            {/* <button 
              onClick={fetchDashboardData}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button> */}
            <PrimaryBtn onClick={fetchDashboardData} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium">Refresh</PrimaryBtn>
          </div>
        </div>

        {/* Stock Report Cards - Main Section with Pastel Colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={FaBox}
            title="RAW Purchased"
            value={rawPurchased}
            unit="meter"
            bgColor="bg-blue-50"
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            textColor="text-blue-600"
          />
          <StatCard
            icon={GiRolledCloth}
            title="Total Used (Final)"
            value={totalUsed}
            unit="meter"
            bgColor="bg-green-50"
            iconBg="bg-green-100"
            iconColor="text-green-600"
            textColor="text-green-600"
          />
          <StatCard
            icon={FaExclamationTriangle}
            title="Total Waste"
            value={totalWaste}
            unit="meter"
            bgColor="bg-red-50"
            iconBg="bg-red-100"
            iconColor="text-red-600"
            textColor="text-red-600"
          />
          <StatCard
            icon={FaBoxes}
            title="LO Created"
            value={loCreated}
            unit="meter"
            bgColor="bg-yellow-50"
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
            textColor="text-yellow-600"
          />
          <StatCard
            icon={FaBoxes}
            title="WIP Created"
            value={wipCreated}
            unit="meter"
            bgColor="bg-purple-50"
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            textColor="text-purple-600"
          />
          <StatCard
            icon={MdInventory}
            title="Total Available"
            value={totalAvailable}
            unit="meter"
            bgColor="bg-indigo-50"
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            textColor="text-indigo-600"
          />
        </div>

        {/* Job Statistics Section */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-primary mb-6">Job Overview</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <FaClipboardList className="text-2xl text-gray-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Jobs</p>
              <p className="text-gray-800 text-3xl font-bold">{totalJobs}</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <FaPrint className="text-2xl text-purple-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Printing</p>
              <p className="text-purple-600 text-3xl font-bold">{printingJobs}</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <FaBoxes className="text-2xl text-orange-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Punching</p>
              <p className="text-orange-600 text-3xl font-bold">{punchingJobs}</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <FaCut className="text-2xl text-teal-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Slitting</p>
              <p className="text-teal-600 text-3xl font-bold">{slittingJobs}</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <FaCheckCircle className="text-2xl text-green-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Completed</p>
              <p className="text-green-600 text-3xl font-bold">{completedJobs}</p>
            </div>
            
            <div className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center mb-3">
                <FaHourglassHalf className="text-2xl text-yellow-600" />
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">In Progress</p>
              <p className="text-yellow-600 text-3xl font-bold">{pendingJobs}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Job Distribution */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-primary mb-6">Job Status Distribution</h3>
            <div className="space-y-4">
              <ProgressBar
                label="Printing"
                value={printingJobs}
                total={totalJobs}
                color="bg-purple-500"
                lightColor="bg-purple-100"
              />
              <ProgressBar
                label="Punching"
                value={punchingJobs}
                total={totalJobs}
                color="bg-orange-500"
                lightColor="bg-orange-100"
              />
              <ProgressBar
                label="Slitting"
                value={slittingJobs}
                total={totalJobs}
                color="bg-teal-500"
                lightColor="bg-teal-100"
              />
              <ProgressBar
                label="Completed"
                value={completedJobs}
                total={totalJobs}
                color="bg-green-500"
                lightColor="bg-green-100"
              />
            </div>
          </div>

          {/* Material Distribution */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-primary mb-6">Material Stock Breakdown</h3>
            <div className="space-y-4">
              <ProgressBar
                label="RAW Material"
                value={rawPurchased}
                total={rawPurchased + loCreated + wipCreated + totalUsed + totalWaste}
                color="bg-blue-500"
                lightColor="bg-blue-100"
              />
              <ProgressBar
                label="LO Material"
                value={loCreated}
                total={rawPurchased + loCreated + wipCreated + totalUsed + totalWaste}
                color="bg-yellow-500"
                lightColor="bg-yellow-100"
              />
              <ProgressBar
                label="WIP Material"
                value={wipCreated}
                total={rawPurchased + loCreated + wipCreated + totalUsed + totalWaste}
                color="bg-purple-500"
                lightColor="bg-purple-100"
              />
              <ProgressBar
                label="Total Used"
                value={totalUsed}
                total={rawPurchased + loCreated + wipCreated + totalUsed + totalWaste}
                color="bg-green-500"
                lightColor="bg-green-100"
              />
              <ProgressBar
                label="Total Waste"
                value={totalWaste}
                total={rawPurchased + loCreated + wipCreated + totalUsed + totalWaste}
                color="bg-red-500"
                lightColor="bg-red-100"
              />
            </div>
          </div>
        </div>

        {/* Material Requests Section */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-primary mb-6">Material Requests</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <FaHourglassHalf className="text-yellow-600 text-2xl" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-yellow-200 text-yellow-700 rounded-full">
                  PENDING
                </span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Requests</p>
              <p className="text-yellow-600 text-4xl font-bold">{pendingRequests}</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  <FaCheckCircle className="text-green-600 text-2xl" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 bg-green-200 text-green-700 rounded-full">
                  APPROVED
                </span>
              </div>
              <p className="text-gray-600 text-sm font-medium mb-1">Approved Requests</p>
              <p className="text-green-600 text-4xl font-bold">{approvedRequests}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;