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
  const [topics, setTopics] = useState({});
  const [myVotes, setMyVotes] = useState([]);
  const [message, setMessage] = useState('Loading TOPIC VOTE...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    } else {
      setRounds([]);
      setTopics({});
      setMyVotes([]);
      setMessage('Sign in to participate in TOPIC VOTE.');
    }
  }, [session]);

  async function loadData() {
    setLoading(true);
    setMessage('');

    const { data: roundData, error } = await supabase
      .from('voting_rounds')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setRounds(roundData || []);

    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .select('*');

    if (topicError) {
      setMessage(topicError.message);
      setLoading(false);
      return;
    }

    const grouped = {};
    (topicData || []).forEach((topic) => {
      if (!grouped[topic.round_id]) grouped[topic.round_id] = [];
      grouped[topic.round_id].push(topic);
    });

    setTopics(grouped);

    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .select('round_id, topic_id')
      .eq('user_id', session.user.id);

    if (voteError) {
      setMessage(voteError.message);
    } else {
      setMyVotes(voteData || []);
    }

    setLoading(false);
  }

  async function signIn(event) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setMessage(error ? error.message : 'Welcome back!');
    setLoading(false);
  }

  async function signUp(event) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    setMessage(
      error
        ? error.message
        : 'Account created. Check your email to verify your account.'
    );

    setLoading(false);
  }

  async function castVote(roundId, topicId) {
    if (!session) return;

    if (myVotes.some((vote) => vote.round_id === roundId)) {
      setMessage('You have already voted in this round.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('votes').insert({
      round_id: roundId,
      topic_id: topicId,
      user_id: session.user.id
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Your vote was submitted successfully!');
      await loadData();
    }

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <main className="app">
      <header className="header">
        <h1>TOPIC VOTE</h1>
        <p>Your voice. Your vote. Your choice.</p>
      </header>

      {!session ? (
        <section className="panel">
          <h2>Welcome to TOPIC VOTE</h2>
          <p>Sign in or create an account to participate.</p>

          <form onSubmit={signIn}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password (minimum 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            <button type="submit" disabled={loading}>
              Sign In
            </button>

            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() =>
                signUp({
                  preventDefault: () => {}
                })
              }
            >
              Create Account
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="panel">
            <p>Signed in as: {session.user.email}</p>
            <button className="secondary" onClick={signOut}>
              Sign Out
            </button>
          </section>

          <h2>Voting Rounds</h2>

          {loading && <p>Loading...</p>}

          {rounds.length === 0 && (
            <p>No voting rounds have been created yet.</p>
          )}

          {rounds.map((round) => {
            const voted = myVotes.some(
              (vote) => vote.round_id === round.id
            );

            return (
              <section className="panel" key={round.id}>
                <span className={`status ${round.status}`}>
                  {round.status.toUpperCase()}
                </span>

                <h3>{round.title}</h3>
                <p>{round.description}</p>

                {round.status === 'open' ? (
                  <>
                    <h4>Choose your topic</h4>

                    {(topics[round.id] || []).map((topic) => (
                      <div className="topic" key={topic.id}>
                        <div>
                          <strong>{topic.title}</strong>
                          <p>{topic.description}</p>
                        </div>

                        <button
                          disabled={voted || loading}
                          onClick={() => castVote(round.id, topic.id)}
                        >
                          {voted ? 'Already Voted' : 'Vote'}
                        </button>
                      </div>
                    ))}

                    {voted && <p>You have voted in this round.</p>}
                  </>
                ) : (
                  <p>Voting is not currently open for this round.</p>
                )}
              </section>
            );
          })}

          <button className="secondary" onClick={loadData}>
            Refresh
          </button>
        </>
      )}

      {message && <p className="message">{message}</p>}

      <footer>© 2026 TOPIC VOTE</footer>
    </main>
  );
      }
