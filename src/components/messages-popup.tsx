import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ConversationsList } from './conversations-list';
import { ConversationChat } from './conversation-chat';
import type { Conversation } from '../lib/types';

interface MessagesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  demoMode?: boolean;
  initialConversation?: Conversation | null;
}

export function MessagesPopup({ 
  isOpen, 
  onClose, 
  userId, 
  demoMode = false,
  initialConversation = null
}: MessagesPopupProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(initialConversation);

  // Update selected conversation when initial conversation changes
  useEffect(() => {
    if (initialConversation) {
      setSelectedConversation(initialConversation);
    }
  }, [initialConversation]);

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleClose = () => {
    setSelectedConversation(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl w-full h-[85vh] max-h-[800px] bg-slate-900 border-slate-700 p-0 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 md:p-6 border-b border-slate-700 flex-shrink-0 space-y-0">
          <DialogTitle className="text-xl md:text-2xl text-slate-100">
            {selectedConversation ? selectedConversation.restaurantName : 'Messages'}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {!selectedConversation ? (
            <div className="h-full overflow-y-auto p-4 md:p-6">
              <ConversationsList 
                userId={userId} 
                onSelectConversation={setSelectedConversation}
                demoMode={demoMode}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <ConversationChat
                conversation={selectedConversation}
                userId={userId}
                onBack={handleBack}
                demoMode={demoMode}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}