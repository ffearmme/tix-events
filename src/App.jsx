import './index.css'
import Hero from './components/Hero'
import Description from './components/Description'
import SeatMap from './components/SeatMap'
import EventDetails from './components/EventDetails'
import FAQ from './components/FAQ'
import Footer from './components/Footer'

// Placeholders for event details
export const EVENT_DATA = {
  ARTIST_NAME: "Spencer Holland",
  TOUR_NAME: "Time of My Life Tour",
  EVENT_DATE: "April 4, 2026",
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
  DOORS_OPEN: "7:00 PM",
  SHOW_START: "7:30 PM",
  AGE_POLICY: "All Ages",
  PARKING: "Street parking available. Rideshare highly recommended.",
  FAQ: [
    { q: "What time should I arrive?", a: "We recommend arriving when doors open at 7:00 PM." },
    { q: "Can I bring my camera?", a: "No professional cameras allowed. Phone cameras are fine." },
    { q: "Are tickets refundable?", a: "All ticket sales are final and non-refundable." }
  ]
};

function App() {
  return (
    <div className="app-container">
      <Hero data={EVENT_DATA} />
      <Description />
      <SeatMap />
      <EventDetails data={EVENT_DATA} />
      <FAQ data={EVENT_DATA} />
      <Footer data={EVENT_DATA} />
    </div>
  )
}

export default App
