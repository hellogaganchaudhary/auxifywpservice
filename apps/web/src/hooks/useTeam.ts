"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActiveAt?: string | null;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
};

export type TeamGroup = {
  id: string;
  name: string;
  description?: string | null;
  members: Array<{
    id: string;
    user: TeamMember;
  }>;
};

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<TeamGroup[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      api.get("/team/members"),
      api.get("/team/invites"),
    ]);
    const groupsRes = await api.get("/team/groups");
    setMembers(membersRes.data);
    setInvites(invitesRes.data);
    setGroups(groupsRes.data);
    setLoading(false);
  }, []);

  const inviteMember = useCallback(async (payload: { email: string; role: string }) => {
    setSaving(true);
    await api.post("/team/invite", payload);
    await load();
    setSaving(false);
  }, [load]);

  const updateRole = useCallback(async (memberId: string, role: string) => {
    setSaving(true);
    await api.patch(`/team/members/${memberId}/role`, { role });
    await load();
    setSaving(false);
  }, [load]);

  const deactivateMember = useCallback(async (memberId: string) => {
    setSaving(true);
    await api.delete(`/team/members/${memberId}`);
    await load();
    setSaving(false);
  }, [load]);

  const revokeInvite = useCallback(async (inviteId: string) => {
    setSaving(true);
    await api.delete(`/team/invites/${inviteId}`);
    await load();
    setSaving(false);
  }, [load]);

  const createGroup = useCallback(async (payload: { name: string; description?: string; memberIds?: string[] }) => {
    setSaving(true);
    await api.post("/team/groups", payload);
    await load();
    setSaving(false);
  }, [load]);

  const updateGroup = useCallback(async (groupId: string, payload: { name?: string; description?: string; memberIds?: string[] }) => {
    setSaving(true);
    await api.patch(`/team/groups/${groupId}`, payload);
    await load();
    setSaving(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    members,
    invites,
    groups,
    loading,
    saving,
    reload: load,
    inviteMember,
    updateRole,
    deactivateMember,
    revokeInvite,
    createGroup,
    updateGroup,
  };
}
