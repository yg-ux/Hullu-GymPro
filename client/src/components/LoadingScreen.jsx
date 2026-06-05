import { Dumbbell } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-dark-200 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Dumbbell className="w-10 h-10 text-white" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gym-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-gym-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-gym-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
