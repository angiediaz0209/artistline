import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { LogOut, Plus, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, getDocs, doc } from 'firebase/firestore';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Real-time listener for artist's events
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('artistId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  const handleDeleteEvent = async (e, eventId) => {
    e.stopPropagation();
    if (!confirm('Delete this event? This cannot be undone.')) return;
  
    try {
      // Delete all queues for this event
      const queuesSnapshot = await getDocs(
        query(collection(db, 'queues'), where('eventId', '==', eventId))
      );
      for (const queueDoc of queuesSnapshot.docs) {
        // Delete all customers in each queue
        const customersSnapshot = await getDocs(
          query(collection(db, 'customers'), where('queueId', '==', queueDoc.id))
        );
        for (const customerDoc of customersSnapshot.docs) {
          await deleteDoc(doc(db, 'customers', customerDoc.id));
        }
        await deleteDoc(doc(db, 'queues', queueDoc.id));
      }
  
      // Delete event
      await deleteDoc(doc(db, 'events', eventId));
      toast.success('Event deleted!');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-lavender-600">🎨 ArtistLine</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {currentUser?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Event Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/create-event')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-lavender-500 to-softpink-500 text-white px-6 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Plus size={24} />
            Create New Event
          </button>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-600"></div>
            <p className="mt-4 text-gray-600">Loading your events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Events Yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first event to start managing queues!
            </p>
            <button
              onClick={() => navigate('/create-event')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-lavender-500 to-softpink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`)}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-lavender-300"
            >
              {/* Event Header */}
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex-1">
                  {event.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.status === 'active' 
                      ? 'bg-green-100 text-green-700'
                      : event.status === 'completed'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {event.status || 'active'}
                  </span>
                  <button
                    onClick={(e) => handleDeleteEvent(e, event.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete event"
                  >
                    🗑️
                  </button>
                </div>
              </div>

                {/* Event Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-lavender-500" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-lavender-500" />
                    <span className="truncate">{event.location?.address || 'No location'}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Queues</span>
                    <span className="font-semibold text-lavender-600">
                      {event.queueCount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Total Served</span>
                    <span className="font-semibold text-softpink-600">
                      {event.totalCustomers || 0}
                    </span>
                  </div>
                </div>

                {/* Color Theme Indicator */}
                <div className="mt-4 flex gap-1">
                  <div 
                    className="h-2 w-full rounded-full"
                    style={{ backgroundColor: `var(--${event.colorTheme || 'lavender'}-400)` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;