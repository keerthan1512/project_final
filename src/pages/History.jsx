import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  SortAsc,
  SortDesc,
  X,
  BarChart,
  PieChart
} from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import toast from 'react-hot-toast';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function History() {
  // State variables
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedFeatureType, setSelectedFeatureType] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCharts, setShowCharts] = useState(false);

  // Fetch history data
  const fetchHistory = async (isNewSearch = false) => {
    try {
      if (isNewSearch) {
        setPage(1);
        setHistory([]);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`https://project-final-u2ba.onrender.com/api/auth/history?page=${isNewSearch ? 1 : page}&search=${searchQuery}&featureType=${selectedFeatureType}&sortBy=${sortBy}&sortOrder=${sortOrder}${startDate ? `&startDate=${startDate.toISOString()}` : ''}${endDate ? `&endDate=${endDate.toISOString()}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          return;
        }
        throw new Error('Failed to fetch history');
      }

    const data = await response.json();
    
    if (isNewSearch) {
        setHistory(data.items);
      } else {
        setHistory(prev => [...prev, ...data.items]);
      }
      
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to load history');
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchHistory(true);
  }, [searchQuery, selectedFeatureType, sortBy, sortOrder, startDate, endDate]);

  // Load more data
  const loadMore = () => {
    setPage(prev => prev + 1);
    fetchHistory();
  };

  // Clear history
  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire history?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://project-final-u2ba.onrender.com/api/auth/history/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to clear history');

      setHistory([]);
      toast.success('History cleared successfully');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  // Download history
  const handleDownload = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://project-final-u2ba.onrender.com/api/auth/history/download?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to download history');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `history.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download history');
    }
  };

  // Chart data
  const chartData = {
    bar: {
      labels: ['AI Analysis', 'Feature Extraction', 'Classification'],
      datasets: [{
        label: 'Number of Analyses',
        data: [
          history.filter(item => item.featureType === 'ai-analysis').length,
          history.filter(item => item.featureType === 'feature-extraction').length,
          history.filter(item => item.featureType === 'classification').length
        ],
        backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)'],
        borderColor: ['rgb(54, 162, 235)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)'],
        borderWidth: 1
      }]
    },
    pie: {
      labels: ['AI Analysis', 'Feature Extraction', 'Classification'],
      datasets: [{
        data: [
          history.filter(item => item.featureType === 'ai-analysis').length,
          history.filter(item => item.featureType === 'feature-extraction').length,
          history.filter(item => item.featureType === 'classification').length
        ],
        backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)'],
        borderColor: ['rgb(54, 162, 235)', 'rgb(75, 192, 192)', 'rgb(153, 102, 255)']
      }]
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Analysis History</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <BarChart size={20} />
            {showCharts ? 'Hide Charts' : 'Show Charts'}
          </button>
          <button
            onClick={handleClearHistory}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Trash2 size={20} />
            Clear History
          </button>
          <div className="relative">
            <button
              onClick={() => document.getElementById('downloadMenu').classList.toggle('hidden')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Download size={20} />
              Download
            </button>
            <div id="downloadMenu" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10">
              <button
                onClick={() => handleDownload('pdf')}
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-t-lg"
              >
                Download as PDF
              </button>
              <button
                onClick={() => handleDownload('csv')}
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
              >
                Download as CSV
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-b-lg"
              >
                Download as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCharts && (
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Analysis Distribution</h3>
            <Bar data={chartData.bar} options={{ responsive: true }} />
          </div>
          <div className="bg-gray-800 p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Analysis Types</h3>
            <Pie data={chartData.pie} options={{ responsive: true }} />
          </div>
        </div>
      )}

      <div className="bg-gray-800 p-6 rounded-xl mb-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white appearance-none"
              value={selectedFeatureType}
              onChange={(e) => setSelectedFeatureType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="classification">Classification</option>
              <option value="ai-analysis">AI Analysis</option>
              <option value="feature-extraction">Feature Extraction</option>
            </select>
          </div>

          <div className="flex gap-2">
            <DatePicker
              selected={startDate}
              onChange={date => setStartDate(date)}
              placeholderText="Start Date"
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white"
              customInput={
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white" />
                </div>
              }
            />
            <DatePicker
              selected={endDate}
              onChange={date => setEndDate(date)}
              placeholderText="End Date"
              className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white"
              customInput={
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg text-white" />
                </div>
              }
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {sortOrder === 'asc' ? <SortAsc size={20} /> : <SortDesc size={20} />}
              {sortBy === 'timestamp' ? 'Date' : 'Name'}
            </button>
            <select
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="timestamp">Sort by Date</option>
              <option value="filename">Sort by Name</option>
              <option value="featureType">Sort by Type</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No history found</p>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={history.length}
          next={loadMore}
          hasMore={hasMore}
          loader={<div className="text-center py-4">Loading more...</div>}
          endMessage={<div className="text-center py-4 text-gray-400">No more results</div>}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-xl p-6 hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedItem(item);
                  setShowModal(true);
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold truncate flex-1">{item.filename}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    item.featureType === 'classification' ? 'bg-blue-500/20 text-blue-300' :
                    item.featureType === 'ai-analysis' ? 'bg-green-500/20 text-green-300' :
                    'bg-purple-500/20 text-purple-300'
                  }`}>
                    {item.featureType}
                  </span>
                </div>
                <p className="text-gray-400 mb-2 truncate">{item.classificationResult}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        </InfiniteScroll>
      )}

      {/* Detail Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">{selectedItem.filename}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-400">Type</h3>
                <p className="text-lg">{selectedItem.featureType}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-400">Result</h3>
                <p className="text-lg">{selectedItem.classificationResult}</p>
              </div>

              {selectedItem.confidence && (
                <div>
                  <h3 className="font-semibold text-gray-400">Confidence</h3>
                  <p className="text-lg">{selectedItem.confidence}%</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-400">Date</h3>
                <p className="text-lg">
                  {format(new Date(selectedItem.timestamp), 'PPpp')}
                </p>
              </div>

              {selectedItem.imageUrl && (
                <div>
                  <h3 className="font-semibold text-gray-400 mb-2">Image</h3>
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.filename}
                    className="rounded-lg max-w-full"
                  />
                </div>
              )}

              {selectedItem.details && (
                <div>
                  <h3 className="font-semibold text-gray-400">Additional Details</h3>
                  <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedItem.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default History;