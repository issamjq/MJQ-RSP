import { Sparkles, Wand2, Palette, Paperclip, Settings as SettingsIcon, MoreHorizontal, ArrowUp, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface ActionCard {
  icon: any;
  title: string;
  description: string;
  gradient: string;
}

const actionCards: ActionCard[] = [
  {
    icon: Sparkles,
    title: 'Generate visual',
    description: 'Create images from text prompts instantly',
    gradient: 'from-pink-100 to-pink-200'
  },
  {
    icon: Wand2,
    title: 'Improve prompt',
    description: 'Enhance your prompt automatically',
    gradient: 'from-purple-100 to-purple-200'
  },
  {
    icon: Palette,
    title: 'Explore styles',
    description: 'Apply curated visual aesthetics and styles',
    gradient: 'from-blue-100 to-blue-200'
  }
];

export function MainContent() {
  const handleCardClick = (title: string) => {
    toast.success(`${title} activated!`, {
      description: 'Feature is ready to use.',
      duration: 3000,
    });
  };

  const handleSendMessage = () => {
    toast.info('Message sent!', {
      description: 'Your query is being processed.',
      duration: 2000,
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-8">
      {/* Welcome Section */}
      <div className="max-w-3xl w-full text-center mb-12">
        {/* Decorative Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e9d5ff" />
                  <stop offset="50%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#fca5a5" />
                </linearGradient>
              </defs>
              <polygon 
                points="50,10 60,40 90,40 65,60 75,90 50,70 25,90 35,60 10,40 40,40" 
                fill="url(#starGradient)"
                opacity="0.8"
              />
              <polygon 
                points="50,25 55,42 72,42 58,52 63,70 50,60 37,70 42,52 28,42 45,42" 
                fill="#fef3c7"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl mb-3 text-gray-900">Welcome, Allison!</h1>
        <p className="text-gray-500 text-base">How can I help you today?</p>
      </div>

      {/* Action Cards */}
      <div className="max-w-4xl w-full grid grid-cols-3 gap-4 mb-16">
        {actionCards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleCardClick(card.title)}
            className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="text-sm mb-1 text-gray-900">{card.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="max-w-3xl w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* Input Field */}
          <div className="relative px-4 py-4">
            <Input
              placeholder="Initiate a query or send a command to the AI..."
              className="w-full border-0 bg-transparent focus-visible:ring-0 pr-12 text-sm placeholder:text-gray-400"
            />
            <button className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Mic className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg gap-2"
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-sm">Attach</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg gap-2"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-sm">Options</span>
              </Button>
            </div>
            
            <Button 
              onClick={handleSendMessage}
              className="bg-black text-white hover:bg-gray-800 rounded-lg w-9 h-9 p-0 flex items-center justify-center"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
