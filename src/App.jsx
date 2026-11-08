import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rounds, setRounds] = useState([]);
  const [message, setMessage] = useState('Loading TOPIC VOTE...');

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setMessage(error.message);
      setSession(data?.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadRounds();
  }, [session]);

  async function loadRounds() {
    setMessage('Loading voting rounds...');

    const { data, error } = await supabase
      .from('voting_rounds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setRounds(data || []);
    setMessage('');
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    setMessage(error ? error.message : 'Check your email to confirm your account.');
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setMessage(error ? error.message : 'Login successful.');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRounds([]);
  }

  if (!session) {
    return (
      <main className="container">
        <h1>TOPIC VOTE</h1>
        <p>Choose. Vote. Make your voice count.</p>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={signIn}>Log In</button>
        <button onClick={signUp}>Create Account</button>

        <p>{message}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>TOPIC VOTE</h1>
      <p>Welcome, {session.user.email}</p>

      <button onClick={signOut}>Log Out</button>

      <h2>Voting Rounds</h2>

      {rounds.length === 0 && <p>No voting rounds available.</p>}

      {rounds.map((round) => (
        <section className="round" key={round.id}>
          <h3>{round.title}</h3>
          <p>{round.description}</p>
          <p>Status: {round.status}</p>
          <button onClick={() => {
            window.location.hash = `round-${round.id}`;
          }}>
            View Round
          </button>
        </section>
      ))}

      <p>{message}</p>
    </main>
  );
}
