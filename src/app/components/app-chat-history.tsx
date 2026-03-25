import { Search, MessageSquare } from 'lucide-react';

export function AppChatHistory() {
  const historyItems = [
    {
      id: 1,
      title: 'Visual exploration',
      description: 'Exploring visual styles, moods, a...',
      avatars: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      ],
      time: '2h ago',
    },
    {
      id: 2,
      title: 'Image generation',
      description: 'Creating a futuristic portrait usin...',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=300&fit=crop',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      time: '3h ago',
    },
    {
      id: 3,
      title: 'Team session',
      description: 'Collaborative prompt editing and...',
      avatars: [
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop',
      ],
      time: '3h ago',
    },
    {
      id: 4,
      title: 'Visualisation',
      description: 'Creating images from text prom...',
      time: '4h ago',
    },
  ];

  return (
    <div className="w-[280px] bg-white h-screen flex flex-col border-l border-border/60">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px]">Chat history</h2>
          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/60 transition-colors">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-accent/40 border-0 rounded-lg pl-9 pr-3 py-2 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* History Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {historyItems.map((item) => (
          <button
            key={item.id}
            className="w-full text-left p-3 rounded-xl hover:bg-accent/40 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 w-3.5 h-3.5 rounded border-gray-300 text-black focus:ring-black"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-medium text-foreground mb-0.5">
                  {item.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mb-2 truncate">
                  {item.description}
                </p>

                {/* Image Preview */}
                {item.image && (
                  <div className="mb-2 rounded-lg overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-24 object-cover"
                    />
                  </div>
                )}

                {/* Avatars or Single Avatar */}
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {item.avatars ? (
                      item.avatars.map((avatar, idx) => (
                        <img
                          key={idx}
                          src={avatar}
                          alt=""
                          className="w-5 h-5 rounded-full border-2 border-white"
                        />
                      ))
                    ) : item.avatar ? (
                      <img
                        src={item.avatar}
                        alt=""
                        className="w-5 h-5 rounded-full border-2 border-white"
                      />
                    ) : null}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Create New Chat Button */}
      <div className="p-4 border-t border-border/60">
        <button className="w-full bg-black text-white py-2.5 rounded-xl text-[13px] font-medium hover:bg-gray-800 transition-colors">
          Create new chat
        </button>
      </div>
    </div>
  );
}
