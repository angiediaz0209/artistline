import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs,
    addDoc,
    updateDoc,
    orderBy,
    serverTimestamp,
    onSnapshot
  } from 'firebase/firestore';
import { Calendar, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';

function ClientJoin() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    childName: '',
    parentName: '',
    phone: '',
    email: '',
    notificationMethod: 'sms',
    isChild: true,
    marketingConsent: false
  });

  useEffect(() => {
    if (!eventId) return;

    // Load event and queues
    const loadData = async () => {
      try {
        // Load event
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
          toast.error('Event not found');
          return;
        }
        
        const eventData = { id: eventDoc.id, ...eventDoc.data() };
        setEvent(eventData);

        // Load visible queues
        const queuesRef = collection(db, 'queues');
        const q = query(
          queuesRef,
          where('eventId', '==', eventId),
          where('isVisible', '==', true),
          where('status', '==', 'open')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const queuesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setQueues(queuesData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load event');
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const getNextNumber = async (queueId) => {
    const customersRef = collection(db, 'customers');
    const q = query(
      customersRef, 
      where('queueId', '==', queueId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 1;
    
    // Find highest number without orderBy
    const numbers = snapshot.docs.map(doc => doc.data().number || 0);
    return Math.max(...numbers) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQueue) {
      toast.error('Please select a queue');
      return;
    }
  
    setSubmitting(true);
  
    try {
      const nextNumber = await getNextNumber(selectedQueue.id);
      
      const customerData = {
        queueId: selectedQueue.id,
        eventId: eventId,
        number: nextNumber,
        childName: formData.isChild ? formData.childName : '',
        parentName: formData.parentName,
        isChild: formData.isChild,
        phone: formData.phone,
        email: formData.email || '',
        notificationMethod: formData.notificationMethod,
        status: 'waiting',
        response: null,
        joinedAt: serverTimestamp()
      };
  
      const docRef = await addDoc(collection(db, 'customers'), customerData);
  
      // Save to contacts if consent given
      if (formData.marketingConsent && (formData.phone || formData.email)) {
        await addDoc(collection(db, 'contacts'), {
          parentName: formData.parentName || formData.childName,
          phone: formData.phone || '',
          email: formData.email || '',
          artistId: event.artistId,
          eventId: eventId,
          eventType: event.eventType || 'other',
          consentDate: serverTimestamp(),
          consentText: "Yes! Notify me about future events from this artist and ArtistLine.",
          source: 'qr'
        });
      }
  
      // Update queue waiting count
      await updateDoc(doc(db, 'queues', selectedQueue.id), {
        waitingCount: (selectedQueue.waitingCount || 0) + 1
      });
  
      // Update event total customers
      await updateDoc(doc(db, 'events', eventId), {
        totalCustomers: (event.totalCustomers || 0) + 1
      });
      
      toast.success(`You're number ${nextNumber}!`);
      navigate(`/customer/${docRef.id}`);
      
    } catch (error) {
      console.error('Error joining queue:', error);
      toast.error('Failed to join queue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600">This event may have been closed or removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 to-softpink-50 pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-lavender-600 mb-2">
              🎨 {event.name}
            </h1>
            <div className="flex flex-col sm:flex-row justify-center gap-3 text-sm text-gray-600">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <MapPin size={16} />
                <span>{event.location?.address}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Queue Selection */}
        {!selectedQueue ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose a Queue</h2>
            
            {queues.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-gray-600">No queues available at this time.</p>
              </div>
            ) : (
              queues.map((queue) => (
                <button
                  key={queue.id}
                  onClick={() => setSelectedQueue(queue)}
                  className="w-full bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all text-left border-2 border-transparent hover:border-lavender-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {queue.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users size={16} />
                        <span>{queue.waitingCount || 0} people waiting</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Current #</p>
                      <p className="text-3xl font-bold text-lavender-600">
                        {queue.currentNumber || 0}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Join Form */
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-lavender-600">
                Join {selectedQueue.name}
              </h2>
              <button
                onClick={() => setSelectedQueue(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="childName"
                  value={formData.childName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-lavender-500 focus:outline-none transition-colors"
                  placeholder="Enter name"
                />
              </div>

              {/* Is this a child's name? */}
              <div className="bg-lavender-50 rounded-xl p-4 border-2 border-lavender-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isChild"
                    checked={formData.isChild}
                    onChange={handleChange}
                    className="w-5 h-5 text-lavender-600 border-gray-300 rounded focus:ring-lavender-500"
                  />
                  <span className="font-medium text-gray-900">
                    This is a child's name
                  </span>
                </label>
              </div>

              {/* Parent Name (if child) */}
              {formData.isChild && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-lavender-500 focus:outline-none transition-colors"
                    placeholder="Parent's name (optional)"
                  />
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-lavender-500 focus:outline-none transition-colors"
                  placeholder="555-0123 (optional)"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-lavender-500 focus:outline-none transition-colors"
                  placeholder="email@example.com"
                />
              </div>

              {/* Notification Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you like to be notified?
                </label>
                <select
                  name="notificationMethod"
                  value={formData.notificationMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-lavender-500 focus:outline-none transition-colors"
                >
                  <option value="sms">SMS Text Message</option>
                  <option value="email">Email</option>
                  <option value="push">Web Notification</option>
                  <option value="none">I'll check the screen</option>
                </select>
              </div>

              {/* Marketing Consent */}
              <div className="bg-gradient-to-r from-lavender-50 to-softpink-50 rounded-xl p-5 border-2 border-lavender-200">
              <label className="flex items-start gap-3 cursor-pointer">
                  <input
                  type="checkbox"
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={handleChange}
                  className="mt-1 w-5 h-5 text-lavender-600 border-gray-300 rounded focus:ring-lavender-500"
                  />
                  <div>
                  <p className="font-semibold text-gray-900">
                    🎁 Hear about future events!
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                      Get notified about upcoming events from this artist and similar events in your area. 
                      We never spam. Unsubscribe anytime.
                  </p>
                  </div>
              </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-lavender-500 to-softpink-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {submitting ? 'Joining...' : 'Join Queue'}
              </button>
            </form>
          </div>
        )}

        {/* Find My Turn */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(`/event/${eventId}/find`)}
            className="text-lavender-600 hover:text-lavender-700 font-medium"
          >
            Already in queue? Find your turn →
          </button>
        </div>
      </main>
    </div>
  );
}

export default ClientJoin;