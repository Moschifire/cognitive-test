"use client";
import { useState, useEffect, useRef } from 'react';
import { questionPool } from '../data/questionBank';

// Fisher-Yates Shuffle to pick 20 random questions from 200
const shuffleAndPick = (array, count) => {
  let shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export default function TestApp() {
  // --- STATE ---
  const [step, setStep] = useState('welcome');
  const [user, setUser] = useState({ name: '', email: '' });
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 MINUTES (600 seconds)
  const [violations, setViolations] = useState(0);

  // --- REFS (Crucial for fixing the "Missing Score on Auto-Submit" bug) ---
  const answersRef = useRef({});
  const questionsRef = useRef([]);

  // Sync state to refs so the timer closure can always access the latest values
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = activeQuestions;
  }, [activeQuestions]);

  // REPLACE WITH YOUR GOOGLE SCRIPT URL
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbVxb4qlcMo_F6Eyc7ay9VTyyIDYFiQQ-Tin6njgjkTNDq_gUgNUalOmvQ4LsPyHOEaw/exec';

  // --- TIMER & ANTI-CHEAT ---
  useEffect(() => {
    let timer;
    if (step === 'test') {
      // 1. Anti-Cheat Listeners
      const handleVisibility = () => {
        if (document.hidden) {
          setViolations(v => v + 1);
          alert("SECURITY WARNING: This incident has been recorded. Please do not leave the test tab.");
        }
      };
      const preventActions = (e) => e.preventDefault();

      document.addEventListener("visibilitychange", handleVisibility);
      document.addEventListener("contextmenu", preventActions);
      document.addEventListener("copy", preventActions);

      // 2. Timer Logic
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // We call the calculation logic directly here to avoid stale closures
            handleFinalSubmission();
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

  // --- LOGIC ---
  const handleStartTest = () => {
    if (!user.name || !user.email) return alert("Please enter your name and email.");

    const selected = shuffleAndPick(questionPool, 20);
    setActiveQuestions(selected);
    questionsRef.current = selected; // Update ref immediately

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { });
    }
    setStep('test');
  };

  // This function handles the logic for both Auto and Manual submit
  const handleFinalSubmission = async () => {
    // 1. Calculate final score using REFS (not state) to ensure accuracy
    let finalScore = 0;
    const currentQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;

    currentQuestions.forEach((q, i) => {
      if (currentAnswers[i] === q.correct) {
        finalScore++;
      }
    });

    // 2. Calculate Percentage (Score over 20 * 100)
    const percentageScore = (finalScore / 20) * 100;

    // 3. UI Updates
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
    setStep('submitting');

    // 4. Prepare Payload
    const payload = {
      name: user.name,
      email: user.email,
      score: finalScore,
      percentage: `${percentageScore}%`, // New Column
      violations: violations,
      timestamp: new Date().toLocaleString()
    };

    try {
      // 5. Send to Google Sheets
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      setTimeout(() => {
        setStep('finished');
      }, 2000);

    } catch (err) {
      console.error("Submission error:", err);
      setStep('finished');
    }
  };

  // --- VIEWS ---

  if (step === 'welcome') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 text-black">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-blue-600">Cognitive Test</h1>
        <p className="text-gray-500 mb-6">Tutor Assessment</p>
        <div className="space-y-4">
          <input
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Full Name"
            value={user.name}
            onChange={e => setUser({ ...user, name: e.target.value })}
          />
          <input
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Email Address"
            type="email"
            value={user.email}
            onChange={e => setUser({ ...user, email: e.target.value })}
          />
          <button
            onClick={() => setStep('instructions')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-bold transition"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  if (step === 'instructions') return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 text-black">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Test Instructions</h2>
        <ul className="space-y-3 mb-8 text-gray-600">
          <li>• <strong>Duration:</strong> 10 minutes total.</li>
          <li>• <strong>Questions:</strong> 20 randomized problems.</li>
          <li>• <strong>Cheating:</strong> Tab switching, copying, and right-click are disabled.</li>
          <li>• <strong>Submission:</strong> Results are sent automatically when time ends.</li>
        </ul>
        <button
          onClick={handleStartTest}
          className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-bold shadow-md transition"
        >
          Start Test
        </button>
      </div>
    </div>
  );

  if (step === 'test') {
    const q = activeQuestions[currentQ];
    return (
      <div className="min-h-screen bg-white p-6 md:p-12 text-black flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="flex justify-between items-center mb-8 bg-gray-50 p-6 rounded-xl border">
            <span className="font-bold text-gray-600">Question {currentQ + 1} / 20</span>
            <span className={`text-2xl font-mono font-bold ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-blue-600"}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <h2 className="text-2xl font-medium mb-8 text-gray-800">{q?.question}</h2>

          <div className="space-y-4 mb-10">
            {q?.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: opt }))}
                className={`w-full text-left p-5 border-2 rounded-xl transition-all ${answers[currentQ] === opt
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-100 hover:bg-gray-50"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-10 border-t pt-8">
            <button
              disabled={currentQ === 0}
              onClick={() => setCurrentQ(q => q - 1)}
              className="px-8 py-2 border rounded-lg font-bold disabled:opacity-20 transition"
            >
              Previous
            </button>

            {currentQ === 19 ? (
              <button
                onClick={handleFinalSubmission}
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

  if (step === 'submitting') return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-xl font-bold">Saving your results securely...</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black p-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-4xl font-bold text-gray-900">Test Complete!</h1>
      <p className="mt-4 text-xl text-gray-600 max-w-md">
        Your answers have been recorded. Our team will review your score and get back to you shortly via email.
      </p>
    </div>
  );
}