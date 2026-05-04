"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/inbox/ConversationList";
import { MessageThread } from "@/components/inbox/MessageThread";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { ContactPanel } from "@/components/inbox/ContactPanel";

export default function InboxPage() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative -m-4 grid h-[calc(100vh-4.5rem)] min-h-[44rem] grid-cols-1 gap-0 overflow-hidden bg-slate-100 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="min-h-0 overflow-hidden rounded-none border-0 border-r border-slate-200 bg-white p-4 shadow-none">
        <ConversationList />
      </Card>
      <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-0 bg-white shadow-none">
        <MessageThread onOpenContact={() => setContactOpen(true)} />
        <MessageComposer />
      </Card>
      {contactOpen ? (
        <div className="absolute inset-0 z-30 flex justify-end bg-slate-950/30 backdrop-blur-[1px]" onClick={() => setContactOpen(false)}>
          <div className="h-full w-full max-w-[420px] border-l border-slate-200 bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <ContactPanel onClose={() => setContactOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
