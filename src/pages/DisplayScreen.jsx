import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

function DisplayScreen() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [queues, setQueues] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    // Load event
    const loadEvent = async () => {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        setEvent({ id: eventDoc.id, ...eventDoc.data() });
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

  // Auto-rotate queues every 5 seconds
  useEffect(() => {
    if (queues.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentQueueIndex((prev) => (prev + 1) % queues.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [queues.length]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-lavender-600 to-softpink-600 text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4"></div>
          <p className="text-2xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event || queues.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-lavender-600 to-softpink-600 text-white p-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">🎨</h1>
          <h2 className="text-4xl font-bold mb-4">{event?.name || 'Event'}</h2>
          <p className="text-2xl opacity-90">No active queues</p>
        </div>
      </div>
    );
  }

  const currentQueue = queues[currentQueueIndex];

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-lavender-50 via-mint-50 to-softpink-50 p-8 relative">
      
      {/* Queue Name */}
      <div className="text-center mb-6">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900">{currentQueue.name}</h2>
        <p className="text-2xl md:text-3xl text-gray-700 mt-2">Now Serving</p>
      </div>
  
      {/* Current Number - MASSIVE with colored border */}
      <div className="bg-white rounded-3xl p-16 md:p-24 mb-8 shadow-2xl border-8 border-lavender-400">
        <div className="text-center">
          <div className="text-[12rem] md:text-[25rem] font-bold leading-none text-gray-900">
            {currentQueue.currentNumber || '-'}
          </div>
        </div>
      </div>
  
      {/* Queue Info */}
      <div className="text-center">
        <p className="text-xl md:text-2xl text-gray-700">
          <span className="font-bold text-gray-900">{currentQueue.waitingCount || 0}</span> people waiting
        </p>
        {currentQueue.waitingCount > 0 && (
          <p className="text-lg md:text-xl text-gray-600 mt-2">
            Est. wait: <span className="font-semibold text-gray-900">{((currentQueue.avgServiceTime || 5) + 2)} min</span>
          </p>
        )}
      </div>
  
      {/* Multiple Queue Indicators */}
      {queues.length > 1 && (
        <>
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-sm text-gray-500">
            Queue {currentQueueIndex + 1} of {queues.length}
            </div>
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
            {queues.map((_, index) => (
                <div
                key={index}
                className={`h-4 rounded-full transition-all ${
                    index === currentQueueIndex
                    ? 'bg-lavender-600 w-12'
                    : 'bg-gray-300 w-4'
                }`}
                />
            ))}
            </div>
        </>
        )}
  
      {/* Auto-rotate indicator */}
      {queues.length > 1 && (
        <div className="absolute top-6 right-6 text-xs text-gray-500">
          Auto-rotating every 5s
        </div>
      )}
    </div>
  );
}

export default DisplayScreen;