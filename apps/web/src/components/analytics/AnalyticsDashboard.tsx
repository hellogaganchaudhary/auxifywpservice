"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/useAnalytics";

function percent(value: number) {
  return `${value}%`;
}

function timeLabel(value: number) {
  return `${value} min`;
}

export function AnalyticsDashboard() {
  const {
    overview,
    agentPerformance,
    templatePerformance,
    broadcastReports,
    creditUsage,
    loading,
  } = useAnalytics();

  if (loading) {
    return <div className="text-sm text-text-muted">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-title">Analytics</div>
        <div className="page-subtitle">
          Overview, agent productivity, campaign funnel, and credit usage.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Messages</div>
          <div className="mt-2 text-2xl font-display">{overview?.messages ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Conversations</div>
          <div className="mt-2 text-2xl font-display">{overview?.conversations ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Opened</div>
          <div className="mt-2 text-2xl font-display">{overview?.opened ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Closed</div>
          <div className="mt-2 text-2xl font-display">{overview?.closed ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-text-muted">Avg Response</div>
          <div className="mt-2 text-2xl font-display">{timeLabel(overview?.avgResponseTime ?? 0)}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-display">Agent Performance</div>
              <div className="text-xs text-text-muted">Conversation handling and response efficiency.</div>
            </div>
            <Badge>{agentPerformance.length} agents</Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Role</th>
                  <th>Handled</th>
                  <th>Resolution</th>
                  <th>First Reply</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.role}</td>
                    <td>{agent.conversationsHandled}</td>
                    <td>{timeLabel(agent.avgResolutionTime)}</td>
                    <td>{timeLabel(agent.firstReplyTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-display">Template Performance</div>
              <div className="text-xs text-text-muted">Delivery, read, and failure quality per template.</div>
            </div>
            <Badge>{templatePerformance.length} templates</Badge>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="table min-w-[720px]">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Usage</th>
                  <th>Delivery</th>
                  <th>Read</th>
                  <th>Failure</th>
                </tr>
              </thead>
              <tbody>
                {templatePerformance.map((template) => (
                  <tr key={template.id}>
                    <td>{template.name}</td>
                    <td>{template.status}</td>
                    <td>{template.usageCount}</td>
                    <td>{percent(template.deliveryRate)}</td>
                    <td>{percent(template.readRate)}</td>
                    <td>{percent(template.failureRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-display">Broadcast Reports</div>
              <div className="text-xs text-text-muted">Campaign funnel across sent, delivered, read, and replied.</div>
            </div>
            <Badge>{broadcastReports.length} campaigns</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {broadcastReports.length === 0 ? (
              <div className="text-sm text-text-muted">No broadcasts available.</div>
            ) : (
              broadcastReports.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="rounded-md border border-border bg-bg-elevated p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{broadcast.name}</div>
                      <div className="text-xs text-text-muted">{broadcast.status}</div>
                    </div>
                    <Badge>{broadcast.stats.sent} sent</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="rounded-sm bg-bg-surface p-3 text-sm">
                      <div className="text-xs text-text-muted">Delivered</div>
                      <div className="mt-1 font-medium">{broadcast.stats.delivered}</div>
                    </div>
                    <div className="rounded-sm bg-bg-surface p-3 text-sm">
                      <div className="text-xs text-text-muted">Read</div>
                      <div className="mt-1 font-medium">{broadcast.stats.read}</div>
                    </div>
                    <div className="rounded-sm bg-bg-surface p-3 text-sm">
                      <div className="text-xs text-text-muted">Replied</div>
                      <div className="mt-1 font-medium">{broadcast.stats.replied}</div>
                    </div>
                    <div className="rounded-sm bg-bg-surface p-3 text-sm">
                      <div className="text-xs text-text-muted">Conversion</div>
                      <div className="mt-1 font-medium">
                        {broadcast.stats.sent > 0
                          ? percent(Math.round((broadcast.stats.replied / broadcast.stats.sent) * 100))
                          : "0%"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-display">Credit Usage</div>
          <div className="mt-1 text-xs text-text-muted">
            Daily spend and top consuming templates.
          </div>

          <div className="mt-4 rounded-md border border-border bg-bg-elevated p-4">
            <div className="text-xs text-text-muted">Total Spent</div>
            <div className="mt-2 text-2xl font-display">{creditUsage?.totalSpent ?? 0}</div>
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase text-text-muted">Daily Spend</div>
            <div className="mt-2 space-y-2">
              {creditUsage?.dailySpend?.length ? (
                creditUsage.dailySpend.map((day) => (
                  <div key={day.date} className="flex items-center justify-between rounded-sm bg-bg-elevated px-3 py-2 text-sm">
                    <span>{day.date}</span>
                    <span>{day.amount}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-text-muted">No spend data yet.</div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase text-text-muted">Top Templates</div>
            <div className="mt-2 space-y-2">
              {creditUsage?.topTemplates?.length ? (
                creditUsage.topTemplates.map((template) => (
                  <div key={template.name} className="flex items-center justify-between rounded-sm bg-bg-elevated px-3 py-2 text-sm">
                    <span>{template.name}</span>
                    <span>{template.amount}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-text-muted">No template spend yet.</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
