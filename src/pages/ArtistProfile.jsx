import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { Calendar, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';

function ArtistProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  
  const [artist, setArtist] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    const loadArtistProfile = async () => {
      try {
        // Find artist by username
        const usernameDoc = await getDocs(
          query(collection(db, 'usernames'), where('__name__', '==', username.toLowerCase()))
        );

        if (usernameDoc.empty) {
          toast.error('Artist not found');
          setLoading(false);
          return;
        }

        const userId = usernameDoc.docs[0].data().userId;

        // Load artist profile
        const artistDoc = await getDocs(
          query(collection(db, 'artists'), where('__name__', '==', userId))
        );

        if (!artistDoc.empty) {
          setArtist({ id: userId, ...artistDoc.docs[0].data() });

          // Load active events for this artist
          const eventsRef = collection(db, 'events');
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const q = query(
            eventsRef,
            where('artistId', '==', userId),
            where('status', '==', 'active'),
            orderBy('date', 'asc')
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              .filter(event => {
                const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
                return eventDate >= today;
              });

            setEvents(eventsData);
            setLoading(false);
          });

          return () => unsubscribe();
        }
      } catch (error) {
        console.error('Error loading artist profile:', error);
        toast.error('Failed to load artist profile');
        setLoading(false);
      }
    };

    loadArtistProfile();
  }, [username]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lavender-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Artist Not Found</h1>
          <p className="text-gray-600">This artist profile doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-lavender-600 mb-2">
              🎨 {artist.displayName}
            </h1>
            <p className="text-gray-600">@{artist.username}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Events</h2>

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Events</h3>
            <p className="text-gray-600">
              This artist doesn't have any upcoming events at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/join/${event.id}`)}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-lavender-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {event.name}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={18} className="text-lavender-500" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      {event.location?.address && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={18} className="text-lavender-500" />
                          <span>{event.location.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">Queues</p>
                    <p className="text-3xl font-bold text-lavender-600">
                      {event.queueCount || 0}
                    </p>
                  </div>
                </div>

                <button className="w-full bg-gradient-to-r from-lavender-500 to-softpink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all mt-4">
                  Join Queue →
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ArtistProfile;