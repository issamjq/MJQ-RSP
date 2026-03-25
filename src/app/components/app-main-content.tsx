import { Sparkles, Paperclip, Settings, SlidersHorizontal, Mic, ArrowUp } from 'lucide-react';

export function AppMainContent() {
  const actionCards = [
    {
      icon: '⭐',
      title: 'Generate visual',
      description: 'Create images from text prompts instantly',
    },
    {
      icon: '✏️',
      title: 'Improve prompt',
      description: 'Enhance your prompt automatically',
    },
    {
      icon: '🎨',
      title: 'Explore styles',
      description: 'Apply curated visual aesthetics and styles',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen relative">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#CBAE64] via-[#d4b86f] to-[#ddc37a] opacity-100"></div>
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-8">
        {/* Star Icon */}
        <div className="mb-8">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Outer star */}
              <polygon
                points="50,10 58,42 90,42 64,62 72,94 50,74 28,94 36,62 10,42 42,42"
                fill="url(#starGradient1)"
                opacity="0.6"
              />
              {/* Inner star */}
              <polygon
                points="50,25 54,42 70,42 57,52 61,69 50,59 39,69 43,52 30,42 46,42"
                fill="url(#starGradient2)"
              />
              {/* Center diamond */}
              <polygon
                points="50,40 56,50 50,60 44,50"
                fill="url(#starGradient3)"
              />
              <defs>
                <linearGradient id="starGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#d8b4f8', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#f8d4e8', stopOpacity: 0.6 }} />
                </linearGradient>
                <linearGradient id="starGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#c8a4e8', stopOpacity: 0.9 }} />
                  <stop offset="100%" style={{ stopColor: '#e8c4d8', stopOpacity: 0.7 }} />
                </linearGradient>
                <linearGradient id="starGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ffc4a0', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#ffb890', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-4xl font-semibold mb-2">Welcome, Allison!</h1>
        <p className="text-muted-foreground text-sm mb-12">How can I help you today?</p>

        {/* Action Cards */}
        <div className="flex gap-4 max-w-3xl w-full">
          {actionCards.map((card, idx) => (
            <button
              key={idx}
              className="flex-1 bg-white/80 backdrop-blur-sm hover:bg-white transition-all p-6 rounded-2xl text-left group hover:shadow-lg hover:scale-[1.02] border border-white/50"
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-medium mb-1 text-sm">{card.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}