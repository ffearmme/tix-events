import './index.css'
import Hero from './components/Hero'
import Description from './components/Description'
import SeatMap from './components/SeatMap'
import EventDetails from './components/EventDetails'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import Reviews from './components/Reviews'
import Merch from './components/Merch'
import AccessGate from './components/AccessGate'

// Placeholders for event details
export const EVENT_DATA = {
  ARTIST_NAME: "Spencer Holland",
  TOUR_NAME: "Time of My Life Tour",
  EVENT_DATE: "April 11, 2026",
  CITY_STATE: "Brooks, Oregon",
  POSTER_IMAGE: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2070&auto=format&fit=crop",
  TICKETS: [
    {
      id: 'ga',
      name: 'General Admission',
      price: '$45',
      description: 'Access to the main floor viewing area. First come, first served.',
      link: '#'
    },
    {
      id: 'early',
      name: 'Early Entry',
      price: '$65',
      description: 'Enter the venue 30 minutes before general admission. Limited availability.',
      link: '#'
    },
    {
      id: 'vip',
      name: 'VIP Experience',
      price: '$120',
      description: 'Includes a signed poster, exclusive acoustic pre-show, and priority entry.',
      link: '#'
    }
  ],
  DOORS_OPEN: "7:30 PM",
  SHOW_START: "8:00 PM",
  AGE_POLICY: "All Ages",
  PARKING: "Street parking available. Rideshare highly recommended.",
  FAQ: [
    { q: "Is my payment information secure?", a: "Yes, absolutely. We use Stripe, a global leader in payment processing (used by Amazon, Google, etc.), to handle all transactions securely. All payment data is encrypted and sent directly to Stripe. Our servers never touch, see, or store your credit card details." },
    { q: "What time should I arrive?", a: "We recommend arriving when doors open at 7:30 PM." },
    { q: "Can I bring my camera?", a: "No professional cameras allowed. Phone cameras are fine." },
    { q: "Are tickets refundable?", a: "All ticket sales are final and non-refundable." }
  ]
};

function App() {
  return (
    <div className="app-container">
      <Hero data={EVENT_DATA} />
      <Description />
      <Reviews />
      <Merch />
      <AccessGate>
        <SeatMap />
      </AccessGate>
      <EventDetails data={EVENT_DATA} />
      <FAQ data={EVENT_DATA} />
      <Footer data={EVENT_DATA} />
    </div>
  )
}

export default App
