import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/inbox/ConversationList";
import { MessageThread } from "@/components/inbox/MessageThread";
import { MessageComposer } from "@/components/inbox/MessageComposer";
import { ContactPanel } from "@/components/inbox/ContactPanel";

export default function InboxPage() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] 2xl:grid-cols-[320px_1fr_340px]">
      <Card className="p-4 lg:h-[calc(100vh-8rem)]">
        <ConversationList />
      </Card>
      <Card className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
        <MessageThread />
        <MessageComposer />
      </Card>
      <Card className="p-4 2xl:h-[calc(100vh-8rem)]">
        <ContactPanel />
      </Card>
    </div>
  );
}
