"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/RoleGuard";
import { useTeam } from "@/hooks/useTeam";

const roles = ["ADMIN", "MANAGER", "AGENT", "VIEWER"];

export default function TeamPage() {
  const { members, invites, groups, loading, saving, inviteMember, updateRole, deactivateMember, revokeInvite, createGroup, updateGroup } = useTeam();
  const [inviteForm, setInviteForm] = useState({ email: "", role: "AGENT" });
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display">Team</h1>
          <p className="text-sm text-text-secondary">
            Manage members and invitations.
          </p>
        </div>
        <RoleGuard roles={['ADMIN', 'MANAGER']}>
          <Button
            onClick={() => inviteMember(inviteForm)}
            disabled={saving || !inviteForm.email}
          >
            Invite member
          </Button>
        </RoleGuard>
      </div>
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            placeholder="Email"
            value={inviteForm.email}
            onChange={(event) =>
              setInviteForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          <select
            className="h-10 rounded-sm border border-border bg-bg-surface px-3 text-sm"
            value={inviteForm.role}
            onChange={(event) =>
              setInviteForm((prev) => ({ ...prev, role: event.target.value }))
            }
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <div className="text-xs text-text-muted">Invite a teammate by email.</div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="mb-4 text-sm font-display">Teams / Groups</div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              placeholder="Group name"
              value={groupForm.name}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder="Description"
              value={groupForm.description}
              onChange={(event) => setGroupForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <RoleGuard roles={['ADMIN', 'MANAGER']}>
            <Button
              onClick={async () => {
                if (!groupForm.name.trim()) return;
                await createGroup(groupForm);
                setGroupForm({ name: "", description: "" });
              }}
              disabled={saving || !groupForm.name.trim()}
            >
              Create group
            </Button>
          </RoleGuard>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {groups.length === 0 ? (
            <div className="text-sm text-text-muted">No groups created yet.</div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs">
                <div className="font-medium text-text-primary">{group.name}</div>
                <div className="text-text-muted">{group.members.length} members</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {members.map((member) => {
                    const checked = group.members.some((item) => item.user.id === member.id);
                    return (
                      <label key={member.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={async (event) => {
                            const memberIds = event.target.checked
                              ? [...group.members.map((item) => item.user.id), member.id]
                              : group.members.map((item) => item.user.id).filter((id) => id !== member.id);
                            await updateGroup(group.id, { memberIds });
                          }}
                        />
                        <span>{member.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-3 text-xs text-text-muted">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
        </div>
        <div className="mt-4 space-y-3">
          {loading && (
            <div className="text-sm text-text-muted">Loading members...</div>
          )}
          {!loading && members.length === 0 && (
            <div className="text-sm text-text-muted">No members found.</div>
          )}
          {members.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-3 items-center rounded-sm bg-bg-elevated px-3 py-2 text-sm"
            >
              <span>{member.name}</span>
              <span>{member.email}</span>
              <div className="flex items-center gap-2">
                <Badge>{member.role}</Badge>
                <span className="text-[11px] text-text-muted">
                  {member.lastActiveAt ? `Last active ${new Date(member.lastActiveAt).toLocaleDateString()}` : "Never active"}
                </span>
                <RoleGuard roles={['ADMIN']}>
                  <select
                    className="h-8 rounded-sm border border-border bg-bg-surface px-2 text-xs"
                    value={member.role}
                    onChange={(event) => updateRole(member.id, event.target.value)}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </RoleGuard>
                <RoleGuard roles={['ADMIN']}>
                  <Button
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => deactivateMember(member.id)}
                  >
                    Deactivate
                  </Button>
                </RoleGuard>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm font-display">Pending Invites</div>
        <table className="table mt-4">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Expires</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-sm text-text-muted">No pending invites.</td>
              </tr>
            ) : invites.map((invite) => (
              <tr key={invite.id}>
                <td>{invite.email}</td>
                <td>{invite.role}</td>
                <td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
                <td>
                  <RoleGuard roles={['ADMIN', 'MANAGER']}>
                    <Button
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => revokeInvite(invite.id)}
                    >
                      Revoke
                    </Button>
                  </RoleGuard>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
