"use client";
import { useState, useEffect } from 'react';
import { questions } from '../data/questions';

export default function TestApp() {
  // 1. State Management
  const [step, setStep] = useState('welcome');
  const [user, setUser] = useState({ name: '', email: '' });
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const [violations, setViolations] = useState(0);

  // REPLACE THIS WITH YOUR GOOGLE SCRIPT URL
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwhYilC8-VwXJGTm1eFoGLtkKOzaJrHnxxhIT7h8RMyN0AURxgTCfGMg8ffwk1uTEG2/exec';

  // 2. Anti-Cheating & Timer Logic
  useEffect(() => {
    if (step === 'test') {
      const handleVisibility = () => {
        if (document.hidden) {
          setViolations(v => v + 1);
          alert("Security Warning: Do not leave this tab.");
        }
      };

      const preventActions = (e) => e.preventDefault();

      document.addEventListener("visibilitychange", handleVisibility);
      document.addEventListener("contextmenu", preventActions);
      document.addEventListener("copy", preventActions);

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        document.removeEventListener("contextmenu", preventActions);
        document.removeEventListener("copy", preventActions);
        clearInterval(timer);
      };
    }
  }, [step]);

  // 3. Form Handlers
  const handleStart = () => {
    if (!user.name || !user.email) return alert("Please fill details");
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
    setStep('test');
  };

  const handleSubmit = async () => {
    // 1. Calculate Score
    let finalScore = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct) finalScore++;
    });

    // 2. Clear UI/Fullscreen
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    setStep('submitting');

    // 3. Use URLSearchParams to ensure data is "visible" to Google
    const formData = new URLSearchParams();
    formData.append('name', user.name);
    formData.append('email', user.email);
    formData.append('score', finalScore);
    formData.append('violations', violations);

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // This is still required
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      // Since no-cors hides the response, we wait 1 second then show the finish screen
      setTimeout(() => setStep('finished'), 1000);

    } catch (err) {
      console.error("Submission error:", err);
      setStep('finished');
    }
  };

  // 4. UI Views

  // WELCOME PAGE
  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-black p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Cognitive Assessment</h1>
          <div className="space-y-4">
            <input
              value={user.name}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Your Full Name"
              onChange={e => setUser({ ...user, name: e.target.value })}
            />
            <input
              value={user.email}
              className="w-full p-3 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Email Address"
              type="email"
              onChange={e => setUser({ ...user, email: e.target.value })}
            />
            <button
              onClick={() => setStep('instructions')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // INSTRUCTIONS PAGE
  if (step === 'instructions') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-black p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
          <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-800">Test Rules</h2>
          <ul className="list-disc pl-5 space-y-3 mb-6 text-gray-600">
            <li><strong>Timer:</strong> You have 15 minutes (900 seconds).</li>
            <li><strong>Navigation:</strong> You can move back and forth between questions.</li>
            <li><strong>Cheating:</strong> Switching tabs or leaving the screen will be flagged.</li>
            <li><strong>Auto-Submit:</strong> The test submits automatically when time ends.</li>
          </ul>
          <button
            onClick={handleStart}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded font-bold transition"
          >
            Start Test Now
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE TEST PAGE
  if (step === 'test') {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-white p-4 md:p-10 text-black flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="flex justify-between items-center mb-8 bg-gray-100 p-4 rounded-lg">
            <span className="font-semibold text-gray-700">Question {currentQ + 1} / {questions.length}</span>
            <span className={`font-mono text-xl font-bold ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-blue-600"}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <h2 className="text-2xl font-medium mb-8 text-gray-800 leading-relaxed">{q.question}</h2>

          <div className="space-y-4">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setAnswers({ ...answers, [currentQ]: opt })}
                className={`w-full text-left p-5 border-2 rounded-xl transition-all ${answers[currentQ] === opt
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-center">
                  <div className={`h-5 w-5 rounded-full border flex-shrink-0 mr-4 ${answers[currentQ] === opt ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`} />
                  <span className="text-lg">{opt}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-12 pt-6 border-t">
            <button
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(q => q - 1)}
              className="px-6 py-2 border rounded-lg font-medium disabled:opacity-20 hover:bg-gray-50"
            >
              Previous
            </button>

            {currentQ === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="px-10 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition"
              >
                Submit Test
              </button>
            ) : (
              <button
                onClick={() => setCurrentQ(q => q + 1)}
                className="px-10 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // SUBMITTING STATE
  if (step === 'submitting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-xl font-medium">Recording your responses...</p>
      </div>
    );
  }

  // FINISHED PAGE
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black p-4 text-center">
      <div className="scale-150 mb-6">✅</div>
      <h1 className="text-3xl font-bold text-gray-900">Thank You!</h1>
      <p className="mt-4 text-lg text-gray-600 max-w-sm">
        Your test has been submitted successfully. We will review your application and get back to you.
      </p>
    </div>
  );
}