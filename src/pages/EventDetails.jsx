import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';import { ArrowLeft, Plus, Calendar, MapPin, Palette, Users, Monitor, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

function EventDetails() {
  const { eventId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [artistUsername, setArtistUsername] = useState('');

  const permanentUrl = `${window.location.origin}/artistline/artist/${artistUsername}`;

  useEffect(() => {
    if (!eventId || !currentUser) return;

    const loadEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };

          // Load artist username
          const artistDoc = await getDoc(doc(db, 'artists', eventData.artistId));
          if (artistDoc.exists()) {
            setArtistUsername(artistDoc.data().username);
            eventData.username = artistDoc.data().username;
          }

          setEvent(eventData);
        } else {
          toast.error('Event not found');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();

    // Real-time listener for queues
    const queuesRef = collection(db, 'queues');
    const q = query(queuesRef, where('eventId', '==', eventId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queuesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQueues(queuesData);
    });

    return () => unsubscribe();
  }, [eventId, currentUser, navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const closeEvent = async () => {
    if (!confirm('Are you sure you want to close this event?')) return;

    try {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'completed'
      });
      toast.success('Event closed');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error closing event:', error);
      toast.error('Failed to close event');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-600"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const handleDeleteQueue = async (e, queueId) => {
    e.stopPropagation();
    if (!confirm('Delete this queue? This cannot be undone.')) return;
  
    try {
      // Delete all customers in queue
      const customersSnapshot = await getDocs(
        query(collection(db, 'customers'), where('queueId', '==', queueId))
      );
      for (const customerDoc of customersSnapshot.docs) {
        await deleteDoc(doc(db, 'customers', customerDoc.id));
      }
  
      // Delete queue
      await deleteDoc(doc(db, 'queues', queueId));
      toast.success('Queue deleted!');
    } catch (error) {
      console.error('Error deleting queue:', error);
      toast.error('Failed to delete queue');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-section, #qr-print-section * { visibility: visible; }
          #qr-print-section { 
            position: fixed; 
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-lavender-500" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-lavender-500" />
                  <span>{event.location?.address || 'No location'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={closeEvent}
              className="px-4 py-2 border-2 border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors"
            >
              Close Event
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Share + QR Section */}
        <div className="bg-gradient-to-r from-lavender-500 to-softpink-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <h2 className="text-xl font-bold mb-4">📱 Share Your Permanent Link</h2>
          <p className="mb-4 opacity-90">
            Give this ONE link to clients - it always shows your active events!
          </p>

          <div className="bg-white/20 backdrop-blur rounded-lg p-4 mb-4">
            <p className="text-sm opacity-75 mb-2">Your permanent URL:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={permanentUrl}
                readOnly
                className="flex-1 px-4 py-2 bg-white/30 backdrop-blur rounded-lg border-2 border-white/50 text-white font-mono text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(permanentUrl);
                  toast.success('Link copied!');
                }}
                className="px-6 py-2 bg-white text-lavender-600 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code + Display Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-2 bg-white text-lavender-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <QrCode size={20} />
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </button>

            <button
              onClick={() => window.open(`/display/${eventId}`, '_blank')}
              className="flex items-center gap-2 bg-white/20 text-white border-2 border-white/50 px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all"
            >
              <Monitor size={20} />
              Open Display Screen
            </button>
          </div>

          {/* QR Code Display */}
          {showQR && (
            <div className="mt-6">
              <div 
                id="qr-print-section"
                className="bg-white rounded-2xl p-8 text-center inline-block"
              >
                <p className="text-lavender-600 font-bold text-xl mb-4">
                  🎨 Scan to Join Queue
                </p>
                <QRCodeSVG
                  value={permanentUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#7C3AED"
                />
                <p className="text-gray-600 text-sm mt-4 font-mono">
                  {permanentUrl}
                </p>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-white text-lavender-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  🖨️ Print QR Code
                </button>
                <p className="text-white/75 text-sm self-center">
                  Print once, use at all your events forever!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-lavender-100 rounded-lg">
                <Users className="text-lavender-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Queues</p>
                <p className="text-3xl font-bold text-gray-900">{queues.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-softpink-100 rounded-lg">
                <Users className="text-softpink-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">{event.totalCustomers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-mint-100 rounded-lg">
                <Palette className="text-mint-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Color Theme</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{event.colorTheme}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Queues Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Queues</h2>
            <button
              onClick={() => navigate(`/event/${eventId}/create-queue`)}
              className="flex items-center gap-2 bg-gradient-to-r from-lavender-500 to-softpink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Create Queue
            </button>
          </div>

          {queues.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Queues Yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first queue to start managing customers!
              </p>
              <button
                onClick={() => navigate(`/event/${eventId}/create-queue`)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-lavender-500 to-softpink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                <Plus size={20} />
                Create Queue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {queues.map((queue) => (
                <div
                  key={queue.id}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-lavender-300 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => navigate(`/queue/${queue.id}/manage`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{queue.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      queue.status === 'open' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {queue.status || 'open'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Current Number:</span>
                      <span className="font-bold text-lavender-600">#{queue.currentNumber || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Queue:</span>
                      <span className="font-bold text-softpink-600">{queue.waitingCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Served:</span>
                      <span className="font-bold text-gray-700">{queue.totalServed || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/queue/${queue.id}/manage`);
                      }}
                      className="flex-1 bg-gradient-to-r from-lavender-500 to-softpink-500 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Manage Queue
                    </button>
                    <button
                      onClick={(e) => handleDeleteQueue(e, queue.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete queue"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/artistline/kiosk/${eventId}/${queue.id}`, '_blank');
                      }}
                      className="py-2 px-3 bg-mint-100 text-mint-700 rounded-lg text-xs font-semibold hover:bg-mint-200 transition-colors"
                    >
                      📱 Kiosk Mode
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/artistline/display/${eventId}`, '_blank');
                      }}
                      className="py-2 px-3 bg-skyblue-100 text-skyblue-700 rounded-lg text-xs font-semibold hover:bg-skyblue-200 transition-colors"
                    >
                      📺 Display
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default EventDetails;