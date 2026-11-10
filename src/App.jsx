export default function App() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <main style={{
      background: '#111827',
      color: 'white',
      minHeight: '100vh',
      padding: '30px',
      fontFamily: 'Arial'
    }}>
      <h1>TOPIC VOTE</h1>
      <h2>Connection Diagnostic</h2>

      <p>Supabase URL: {url ? 'FOUND' : 'MISSING'}</p>
      <p>Publishable Key: {key ? 'FOUND' : 'MISSING'}</p>

      <p>Diagnostic complete.</p>
    </main>
  );
}

