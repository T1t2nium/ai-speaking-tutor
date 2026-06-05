import { scenarios } from '@tutor/shared/scenarios';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Practice English, Speak with Confidence
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Have real-time voice conversations with an AI tutor. Get instant feedback
          on your pronunciation, grammar, and fluency. Track your progress over time.
        </p>
      </section>

      {/* Scenarios */}
      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">Choose a Scenario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {scenarios.map((scenario) => (
            <Link
              key={scenario.id}
              href={`/session/${scenario.id}`}
              className="card group cursor-pointer"
            >
              <div className="text-4xl mb-4">{scenario.icon}</div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                {scenario.title}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{scenario.description}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium
                  ${scenario.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    scenario.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'}`}>
                  {scenario.difficulty}
                </span>
                <span className="text-xs text-slate-400">{scenario.durationMin} min</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-20">
        <h2 className="text-2xl font-semibold text-slate-800 mb-8 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Choose a Scenario', desc: 'Pick a real-life situation — ordering food, job interview, travel, and more.' },
            { step: '2', title: 'Speak Naturally', desc: 'Talk to the AI tutor by voice. It listens and responds like a real conversation partner.' },
            { step: '3', title: 'Get Feedback', desc: 'After each session, review your pronunciation, grammar, and fluency scores with detailed tips.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
