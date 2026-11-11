
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [topics, setTopics] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newRound, setNewRound] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTopics, setNewTopics] = useState('');
  const [message, setMessage] = useState('Loading TOPIC VOTE...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadData();
    } else {
      setProfile(null);
      setRounds([]);
      setTopics([]);
      setMyVotes([]);
      setMessage('Welcome to TOPIC VOTE. Sign in or create an account.');
    }
  }, [session]);

  async function loadData() {
    setLoading(true);
    setMessage('');

    const userId = session.user.id;

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, role')
      .eq('id', userId)
      .single();

    if (profileError) {
      setMessage('Could not load your profile: ' + profileError.message);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    const { data: roundData, error: roundError } = await supabase
      .from('voting_rounds')
      .select('*')
      .order('created_at', { ascending: false });

    if (roundError) {
      setMessage('Could not load voting rounds: ' + roundError.message);
      setLoading(false);
      return;
    }

    setRounds(roundData || []);

    const { data: topicData, error: topicError } = await supabase
      .from('topics')
      .select('*');

    if (topicError) {
      setMessage('Could not load topics: ' + topicError.message);
      setLoading(false);
      return;
    }

    setTopics(topicData || []);

    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .select('round_id, topic_id')
      .eq('user_id', userId);

    if (voteError) {
      setMessage('Could not load your votes: ' + voteError.message);
    } else {
      setMyVotes(voteData || []);
    }

    setLoading(false);
  }

  async function signUp() {
    if (!email || !password) {
      setMessage('Enter your email and password.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    });

    setMessage(error ? error.message : 'Account created. Check your email to confirm your account before signing in.');
    setLoading(false);
  }

  async function signIn() {
    if (!email || !password) {
      setMessage('Enter your email and password.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setMessage(error ? error.message : 'Signed in successfully.');
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('You have signed out.');
  }

  async function castVote(roundId, topicId) {
    if (!session?.user) return;

    const alreadyVoted = myVotes.some(vote => vote.round_id === roundId);

    if (alreadyVoted) {
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
      setMessage('Vote not submitted: ' + error.message);
    } else {
      setMessage('Your vote has been submitted!');
      await loadData();
    }

    setLoading(false);
  }

  async function createRound() {
    if (!newRound.trim() || !newTopics.trim()) {
      setMessage('Enter a round title and at least one topic.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('voting_rounds')
      .insert({
        title: newRound.trim(),
        description: newDescription.trim(),
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      setMessage('Could not create round: ' + error.message);
      setLoading(false);
      return;
    }

    const topicList = newTopics
      .split('\n')
      .map(title => title.trim())
      .filter(Boolean)
      .map(title => ({
        round_id: data.id,
        title,
        description: ''
      }));

    const { error: topicError } = await supabase
      .from('topics')
      .insert(topicList);

    if (topicError) {
      setMessage('Round created, but topics could not be added: ' + topicError.message);
    } else {
      setMessage('Voting round and topics created. The round is still a draft.');
      setNewRound('');
      setNewDescription('');
      setNewTopics('');
      await loadData();
    }

    setLoading(false);
  }

  async function changeRoundStatus(roundId, status) {
    setLoading(true);

    const { error } = await supabase
      .from('voting_rounds')
      .update({ status })
      .eq('id', roundId);

    setMessage(error ? error.message : 'Round status updated.');
    await loadData();
    setLoading(false);
  }

  const isAdmin = profile?.role === 'admin';

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#111827',
      color: 'white',
      padding: '24px 14px',
      fontFamily: 'Arial, sans-serif'
    },
    panel: {
      maxWidth: '650px',
      margin: '20px auto',
      padding: '22px',
      background: '#1f2937',
      borderRadius: '14px'
    },
    input: {
      width: '100%',
      padding: '13px',
      margin: '7px 0',
      borderRadius: '7px',
      border: '1px solid #4b5563',
      background: '#374151',
      color: 'white',
      fontSize: '16px',
      boxSizing: 'border-box'
    },
    button: {
      width: '100%',
      padding: '13px',
      margin: '7px 0',
      border: 0,
      borderRadius: '7px',
      background: '#0284c7',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '15px',
      cursor: 'pointer'
    },
    secondary: {
      background: '#4b5563'
    },
    item: {
      padding: '14px',
      margin: '10px 0',
      border: '1px solid #4b5563',
      borderRadius: '9px'
    }
  };

  return (
    <main style={styles.page}>
      <header style={{ textAlign: 'center', padding: '12px' }}>
        <h1 style={{ color: '#38bdf8', fontSize: '38px' }}>
          TOPIC VOTE
        </h1>
        <p>One voice. One vote. Your opinion matters.</p>
      </header>

      {message && (
        <div style={{ ...styles.panel, color: '#bae6fd' }}>
          {message}
        </div>
      )}

      {!session && (
        <section style={styles.panel}>
          <h2>Welcome</h2>
          <p>Sign in or create your voter account.</p>

          <input
            style={styles.input}
            placeholder="Your name (for registration)"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />

          <input
            style={styles.input}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <button style={styles.button} onClick={signIn} disabled={loading}>
            Sign In
          </button>

          <button
            style={{ ...styles.button, ...styles.secondary }}
            onClick={signUp}
            disabled={loading}
          >
            Create Account
          </button>
        </section>
      )}

      {session && (
        <>
          <section style={styles.panel}>
            <h2>My Account</h2>
            <p>Email: {session.user.email}</p>
            <p>Role: {profile?.role || 'Loading...'}</p>
            <button
              style={{ ...styles.button, ...styles.secondary }}
              onClick={signOut}
            >
              Sign Out
            </button>
            <button
              style={{ ...styles.button, ...styles.secondary }}
              onClick={loadData}
            >
              Refresh
            </button>
          </section>

          <section style={styles.panel}>
            <h2>Voting Rounds</h2>

            {rounds.length === 0 && <p>No voting rounds available.</p>}

            {rounds.map(round => {
              const roundTopics = topics.filter(
                topic => topic.round_id === round.id
              );
              const voted = myVotes.some(
                vote => vote.round_id === round.id
              );

              return (
                <div key={round.id} style={styles.item}>
                  <h3>{round.title}</h3>
                  <p>{round.description}</p>
                  <p>
                    Status: <strong>{round.status.toUpperCase()}</strong>
                  </p>

                  {round.status === 'open' && (
                    <>
                      {voted ? (
                        <p style={{ color: '#86efac' }}>
                          You have voted in this round.
                        </p>
                      ) : (
                        <p>Select one topic to cast your vote:</p>
                      )}

                      {roundTopics.map(topic => (
                        <div key={topic.id} style={styles.item}>
                          <strong>{topic.title}</strong>
                          {topic.description && <p>{topic.description}</p>}
                          {!voted && (
                            <button
                              style={styles.button}
                              disabled={loading}
                              onClick={() => castVote(round.id, topic.id)}
                            >
                              Vote for this topic
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {round.status !== 'open' && (
                    <p>This voting round is not accepting votes.</p>
                  )}

                  {isAdmin && (
                    <div>
                      {round.status === 'draft' && (
                        <button
                          style={styles.button}
                          onClick={() => changeRoundStatus(round.id, 'open')}
                        >
                          Open Voting
                        </button>
                      )}
                      {round.status === 'open' && (
                        <button
                          style={{ ...styles.button, background: '#b45309' }}
                          onClick={() => changeRoundStatus(round.id, 'closed')}
                        >
                          Close Voting
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {isAdmin && (
            <section style={styles.panel}>
              <h2>Admin: Create Voting Round</h2>

              <input
                style={styles.input}
                placeholder="Voting round title"
                value={newRound}
                onChange={e => setNewRound(e.target.value)}
              />

              <input
                style={styles.input}
                placeholder="Description"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              />

              <textarea
                style={{ ...styles.input, minHeight: '130px' }}
                placeholder={'Enter one topic per line:\nTopic A\nTopic B\nTopic C'}
                value={newTopics}
                onChange={e => setNewTopics(e.target.value)}
              />

              <button
                style={styles.button}
                onClick={createRound}
                disabled={loading}
              >
                Create Voting Round
              </button>
            </section>
          )}
        </>
      )}

      <footer style={{ textAlign: 'center', padding: '25px', color: '#9ca3af' }}>
        TOPIC VOTE
      </footer>
    </main>
  );
}
