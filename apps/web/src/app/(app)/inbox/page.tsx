import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/inbox/ConversationList";
import { MessageThread } from "@/components/inbox/MessageThread";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { ContactPanel } from "@/components/inbox/ContactPanel";

export default function InboxPage() {
  return (
    <div className="grid h-[calc(100vh-7.5rem)] min-h-[42rem] grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_360px]">
      <Card className="min-h-0 overflow-hidden rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
        <ConversationList />
      </Card>
      <Card className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border-slate-200 bg-white shadow-sm">
        <MessageThread />
        <MessageComposer />
      </Card>
      <Card className="min-h-0 overflow-hidden rounded-[1.5rem] border-slate-200 bg-white p-4 shadow-sm">
        <ContactPanel />
      </Card>
    </div>
  );
}
