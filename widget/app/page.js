'use client';

import { useState, useEffect } from 'react';

export default function Page() {
  const [feedback, setFeedback] = useState('');
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    function handleMessage(event) {
      console.log('Widget received logs:', event.data.payload);
      setClientId(event.data.clientId || null);

      if (event.data.type === 'STACKSIGNAL_LOGS') {
        setSessionId(event.data.sessionId || null);
        setLogs(event.data.payload);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('Sending...');

    try {
      console.log('Submitting feedback:', { feedback, logs, sessionId, clientId });

      await new Promise(resolve => setTimeout(resolve, 600));

      const res = await fetch('http://localhost:4000/api/v1/bug/report-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, logs, sessionId, clientId }),
      });

      if (res.ok) {
        setStatus('Feedback sent! Thank you.');
        setFeedback('');
        setLogs([]);
      } else {
        setStatus('Failed to send feedback.');
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      setStatus('Error sending feedback.');
    }
  }

  return (
    // Full height inside iframe, compact spacing
    <main className="h-screen bg-white flex flex-col">
      {/* Header: compact */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2.5 h-20 flex-shrink-0">
        <h1 className="text-2xl font-semibold text-white text-center">
          Send Feedback
        </h1>
        <p className="text-indigo-100 text-md text-center mt-0.5">
          Help us improve your experience
        </p>
      </div>

      {/* Body: center form */}
<div className="flex-1 flex items-center justify-center px-4">
  <form
    onSubmit={handleSubmit}
    className="w-full max-w-xs flex flex-col gap-3"
  >
    <label className="block text-xl font-medium text-slate-700 mb-1.5">
      What's on your mind?
    </label>
    <textarea
      className="w-full h-40 resize-y p-3 text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-slate-400"
      placeholder="Describe your issue, suggestion, or feedback..."
      required
      value={feedback}
      onChange={(e) => setFeedback(e.target.value)}
    />
    <button
      type="submit"
      className="w-full bg-gradient-to-r h-12 from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/25 transition"
    >
      Send Feedback
    </button>
    {/* Status: compact chip */}
    {status && (
      <div className="text-center">
        <div
          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-[11px] font-medium ${
            status.includes('sent') || status.includes('Thank you')
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : status.includes('Sending')
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {status.includes('Sending') && (
            <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {status}
        </div>
      </div>
    )}
  </form>
</div>

      {/* Footer: thinner */}
      <div className="text-center py-1.5 px-3 bg-slate-50 border-t border-slate-200 flex-shrink-0">
        <p className="text-[11px] text-slate-500">Powered by StackSignal</p>
      </div>
    </main>
  );
}