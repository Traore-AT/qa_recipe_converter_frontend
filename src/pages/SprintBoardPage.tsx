import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { PageLayout } from '../components/layout/PageLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import type { UseCaseDetail, UseCaseScreenshot, UseCaseAssignment, ProjectMember } from '../types';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/errors';

const STATUS_COLUMNS = ['À tester', 'En cours', 'Passé', 'Échoué', 'Bloqué'];
const STATUS_COLORS: Record<string, string> = {
  'À tester': 'bg-outline-variant',
  'En cours': 'bg-primary',
  'Passé': 'bg-success',
  'Échoué': 'bg-error',
  'Bloqué': 'bg-warning',
};

type SprintCaseDraft = Pick<UseCaseAssignment, 'use_case_text' | 'jira_ticket' | 'description' | 'preconditions' | 'steps' | 'expected_results' | 'observed_results' | 'status' | 'assigned_to'> & { comment: string };

export default function SprintBoardPage() {
  const { slug, projectSlug, sprintId } = useParams<{ slug: string; projectSlug: string; sprintId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<string | ''>(sprintId || '');
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' });
  const [assignData, setAssignData] = useState({ use_case_ids: [] as string[], user_id: 0 });
  const [detailAssignmentId, setDetailAssignmentId] = useState<string | null>(null);
  const [ucComment, setUcComment] = useState('');
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketEditor, setTicketEditor] = useState<SprintCaseDraft | null>(null);
  const [assignmentEditor, setAssignmentEditor] = useState<UseCaseAssignment | null>(null);

  const handleColumnDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData('assignmentId');
    const sourceCol = e.dataTransfer.getData('sourceCol');

    if (!assignmentId || !targetCol || !sourceCol || targetCol === sourceCol) return;

    // Find the assignment in the source column and update its status
    const statusMap: Record<string, string> = {
      'À tester': 'À tester',
      'En cours': 'En cours',
      'Passé': 'Passé',
      'Échoué': 'Échoué',
      'Bloqué': 'Bloqué',
    };

    const newStatus = statusMap[targetCol] || 'À tester';

    // Call the API to update the use case status
    statusMutation.mutate({ assignmentId, status: newStatus });

    // Rafraîchit le tableau (le cache est invalidé par la mutation de statut)
    queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentTeam } = useQuery({
    queryKey: queryKeys.team(slug),
    queryFn: () => teamsApi.getTeam(slug!),
    enabled: !!slug,
  });
  const canManage = currentTeam?.my_role === 'owner' || currentTeam?.my_role === 'admin';

  const { data: sprints } = useQuery({
    queryKey: queryKeys.sprints(slug, projectSlug),
    queryFn: () => teamsApi.listSprints(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug,
  });

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint),
    queryFn: () => teamsApi.getSprintBoard(slug!, projectSlug!, selectedSprint as string),
    enabled: !!slug && !!projectSlug && !!selectedSprint,
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.projectMembers(slug, projectSlug),
    queryFn: () => teamsApi.listProjectMembers(slug!, projectSlug!),
    enabled: !!slug && !!projectSlug && (showAssignModal || !!ticketEditor || !!assignmentEditor),
  });

  const { data: unassigned } = useQuery({
    queryKey: queryKeys.unassignedUcs(slug, projectSlug, selectedSprint),
    queryFn: () => teamsApi.getUnassignedUseCases(slug!, projectSlug!, selectedSprint || undefined),
    enabled: !!slug && !!projectSlug && showAssignModal,
  });

  const { data: ucDetail, isLoading: ucDetailLoading } = useQuery({
    queryKey: queryKeys.ucDetail(slug, projectSlug, detailAssignmentId),
    queryFn: () => teamsApi.getUseCaseDetail(slug!, projectSlug!, detailAssignmentId!),
    enabled: !!slug && !!projectSlug && !!detailAssignmentId,
  });

  const selectedAssignment = useMemo(() => {
    if (!detailAssignmentId) return undefined;
    return Object.values(board?.columns ?? {}).flat().find(a => a.id === detailAssignmentId);
  }, [board, detailAssignmentId]);

  const createSprintMutation = useMutation({
    mutationFn: () => teamsApi.createSprint(slug!, projectSlug!, newSprint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sprints(slug, projectSlug) });
      setShowCreateModal(false);
      setNewSprint({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' });
    },
  });

  const assignMutation = useMutation({
    mutationFn: () => teamsApi.createAssignments(slug!, projectSlug!, {
      use_case_ids: assignData.use_case_ids,
      sprint_id: selectedSprint || null,
      user_id: assignData.user_id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unassignedUcs(slug, projectSlug, selectedSprint) });
      setShowAssignModal(false);
      setAssignData({ use_case_ids: [], user_id: 0 });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ assignmentId, status }: { assignmentId: string; status: string }) =>
      teamsApi.updateSprintCase(slug!, projectSlug!, assignmentId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) });
    },
  });

  const jiraTicketMutation = useMutation({
    mutationFn: ({ assignmentId, jiraTicket }: { assignmentId: string; jiraTicket: string }) =>
      teamsApi.updateSprintCase(slug!, projectSlug!, assignmentId, { jira_ticket: jiraTicket }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ucDetail(slug, projectSlug, detailAssignmentId) });
    },
  });

  const uploadScreenshotMutation = useMutation({
    mutationFn: ({ assignmentId, file, caption }: { assignmentId: string; file: File; caption: string }) => {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('caption', caption);
      return teamsApi.uploadScreenshot(slug!, projectSlug!, assignmentId, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ucDetail(slug, projectSlug, detailAssignmentId) });
    },
  });

  const deleteScreenshotMutation = useMutation({
    mutationFn: ({ assignmentId, screenshotId }: { assignmentId: string; screenshotId: string }) =>
      teamsApi.deleteScreenshot(slug!, projectSlug!, assignmentId, screenshotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ucDetail(slug, projectSlug, detailAssignmentId) });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ ucId, content }: { ucId: string; content: string }) =>
      teamsApi.createUseCaseComment(slug!, projectSlug!, ucId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ucDetail(slug, projectSlug, detailAssignmentId) });
      setUcComment('');
    },
  });

  const saveTicketMutation = useMutation({
    mutationFn: (data: SprintCaseDraft) => teamsApi.createSprintCase(slug!, projectSlug!, selectedSprint as string, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) }); setTicketEditor(null); },
  });
  const saveAssignmentMutation = useMutation({
    mutationFn: (assignment: UseCaseAssignment) => teamsApi.updateSprintCase(slug!, projectSlug!, assignment.id, {
      use_case_text: assignment.use_case_text, jira_ticket: assignment.jira_ticket,
      description: assignment.description, preconditions: assignment.preconditions,
      steps: assignment.steps, expected_results: assignment.expected_results,
      observed_results: assignment.observed_results, status: assignment.status,
      assigned_to: assignment.assigned_to,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) }); setAssignmentEditor(null); },
  });
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => teamsApi.deleteAssignment(slug!, projectSlug!, assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) }),
  });

  const currentSprint = sprints?.results?.find(s => s.id === selectedSprint);

  return (
    <PageLayout>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/teams/${slug}/projects/${projectSlug}`)} className="flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-1 cursor-pointer">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            Retour au projet
          </button>
          <h1 className="text-headline-lg font-bold text-on-surface">Tableau Sprint</h1>
        </div>
        <div className="flex gap-2">
          {selectedSprint && (
            <Button variant="secondary" size="sm" onClick={() => teamsApi.exportSprintCSV(slug!, projectSlug!, selectedSprint)}>
              Exporter CSV
            </Button>
          )}
        {canManage && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>+ Nouveau sprint</Button>
              <Button size="sm" onClick={() => setShowAssignModal(true)} disabled={!selectedSprint}>+ Assigner des cas</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedSprint('')}
          className={`px-3 py-1.5 rounded-lg text-body-sm transition-all ${!selectedSprint ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`}
        >
          Tous les sprints
        </button>
        {sprints?.results?.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSprint(s.id)}
            className={`px-3 py-1.5 rounded-lg text-body-sm transition-all ${selectedSprint === s.id ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'}`}
          >
            {s.name}
            <Badge variant={s.status === 'active' ? 'success' : s.status === 'completed' ? 'info' : 'default'} className="ml-1.5">
              {s.status}
            </Badge>
          </button>
        ))}
      </div>

      {currentSprint && (
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 className="text-headline-md font-bold text-on-surface">{currentSprint.name}</h2>
                {currentSprint.goal && <p className="text-body-sm text-on-surface-variant mt-1">{currentSprint.goal}</p>}
              </div>
              <Badge variant={currentSprint.status === 'active' ? 'success' : currentSprint.status === 'completed' ? 'info' : 'default'}>
                {currentSprint.status}
              </Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {currentSprint.start_date} → {currentSprint.end_date} ({currentSprint.duration_days} jours)
            </p>
            {currentSprint.stats && currentSprint.stats.total > 0 && (
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden flex">
                  {STATUS_COLUMNS.map(s => {
                    const key = s === 'À tester' ? 'not_run' : s === 'En cours' ? 'in_progress' : s.toLowerCase() as keyof typeof currentSprint.stats;
                    const count = currentSprint.stats![key] as number || 0;
                    const pct = currentSprint.stats!.total > 0 ? (count / currentSprint.stats!.total) * 100 : 0;
                    if (pct === 0) return null;
                    return <div key={s} className={`h-full ${STATUS_COLORS[s]}`} style={{ width: `${pct}%` }} title={`${s}: ${count}`} />;
                  })}
                </div>
                <span className="text-label-sm font-mono text-on-surface-variant">
                  {currentSprint.stats.passed}/{currentSprint.stats.total} ({currentSprint.stats.progress_pct}%)
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {!!selectedSprint && <div className="flex justify-between items-center gap-3 mb-3"><p className="text-body-sm text-on-surface-variant">Les tickets sont intégrés aux colonnes du sprint. Glissez une carte pour changer son statut.</p><input type="search" aria-label="Rechercher un ticket par numéro" placeholder="Rechercher par numéro de ticket" value={ticketQuery} onChange={e => setTicketQuery(e.target.value)} className="w-full sm:w-80 border border-outline-variant rounded-lg px-3 py-2 bg-surface text-on-surface" /></div>}
      {(saveTicketMutation.isError || saveAssignmentMutation.isError || deleteAssignmentMutation.isError || statusMutation.isError) && <p role="alert" className="mb-3 text-error">{getApiErrorMessage(saveTicketMutation.error || saveAssignmentMutation.error || deleteAssignmentMutation.error || statusMutation.error, 'Échec de l’opération sur le cas.')}</p>}

      {boardLoading ? (
        <div className="animate-pulse grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-96 bg-surface-container-high rounded-xl" />)}
        </div>
      ) : board ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {STATUS_COLUMNS.map(col => (
            <div key={col} className="bg-surface-container-low rounded-xl p-3 min-h-[400px]" onDrop={(e) => handleColumnDrop(e, col)} onDragOver={(e) => e.preventDefault()}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-label-md font-bold text-on-surface">{col}</h3>
                {canManage && <button type="button" aria-label={`Créer un cas dans ${col}`} onClick={() => setTicketEditor({ use_case_text: '', jira_ticket: '', description: '', preconditions: '', steps: '', expected_results: '', observed_results: '', status: col, assigned_to: null, comment: '' })} className="text-primary text-label-sm hover:underline">+ Créer</button>}
                <span className="text-body-sm text-on-surface-variant font-mono">
                  {(board.columns[col]?.length || 0)}
                </span>
              </div>
              <div className="space-y-2">
                {(board.columns[col] || []).filter(a => !ticketQuery.trim() || `${a.ticket_number} CAS-${String(a.case_number).padStart(3, '0')} ${a.use_case_text} ${a.jira_ticket || ''}`.toLowerCase().includes(ticketQuery.trim().toLowerCase())).map((assignment) => {
                  const statusColorMap: Record<string, string> = {
                    'À tester': 'bg-outline-variant text-on-surface-variant',
                    'En cours': 'bg-primary text-white',
                    'Passé': 'bg-success text-white',
                    'Échoué': 'bg-error text-white',
                    'Bloqué': 'bg-warning text-white',
                  };
return (
                    <div key={assignment.id} className="bg-surface border border-outline-variant rounded-lg p-3 cursor-grab draggable"
                     onClick={(e) => { e.stopPropagation(); setDetailAssignmentId(assignment.id); }}
                     draggable={true}
                     onDragStart={(e) => {
                       e.dataTransfer.setData('assignmentId', assignment.id);
                       e.dataTransfer.setData('sourceCol', col);
                       e.dataTransfer.effectAllowed = 'move';
                     }}
                     onDragOver={(e) => e.preventDefault()}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-label-sm font-bold text-primary shrink-0">
                        CAS-{String(assignment.case_number).padStart(3, '0')}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[0.625rem] font-bold uppercase tracking-wider shrink-0 ${statusColorMap[assignment.status] || 'bg-outline-variant text-on-surface-variant'}`}>
                        {assignment.status}
                      </span>
                    </div>
                    <p className="text-body-sm text-on-surface line-clamp-2 mb-2.5 leading-snug">
                      {assignment.use_case_id_str || assignment.use_case_desc}
                    </p>
                    {assignment.jira_ticket ? (
                      <div className="mb-2.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[0.875rem] text-primary">link</span>
                        <a
                          href={assignment.jira_url || '#'}
                          target={assignment.jira_url ? '_blank' : undefined}
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-info-container/50 border border-info/20 text-info text-body-xs font-semibold font-mono hover:bg-info-container transition-colors"
                        >
                          {assignment.jira_ticket}
                        </a>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[0.5rem] font-bold flex items-center justify-center shrink-0">
                          {(assignment.assigned_to_user?.full_name || '?')[0]}
                        </span>
                        <span className="text-body-xs text-on-surface-variant truncate">
                          {assignment.assigned_to_user?.full_name || 'Non assigné'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canManage && (
                          <select
                            value={assignment.status}
                            onClick={e => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); statusMutation.mutate({ assignmentId: assignment.id, status: e.target.value }); }}
                            className="text-[0.6rem] bg-transparent border border-outline-variant rounded px-1 py-0.5"
                          >
                            {STATUS_COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                    {canManage && <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); setAssignmentEditor({ ...assignment }); }}>Modifier</Button>
                      <Button size="sm" variant="secondary" disabled={deleteAssignmentMutation.isPending} onClick={e => { e.stopPropagation(); if (window.confirm(`Supprimer CAS-${String(assignment.case_number).padStart(3, '0')} de la recette et de tous les sprints ?`)) deleteAssignmentMutation.mutate(assignment.id); }}>Supprimer</Button>
                    </div>}
                  </div>
                );})}
                {!(board.columns[col] || []).some(a => !ticketQuery.trim() || `${a.ticket_number} CAS-${String(a.case_number).padStart(3, '0')} ${a.use_case_text} ${a.jira_ticket || ''}`.toLowerCase().includes(ticketQuery.trim().toLowerCase())) && (
                  <div className="text-center py-8 text-body-sm text-on-surface-variant italic">
                    Aucun cas
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-body-base text-on-surface-variant mb-4">
            Sélectionnez un sprint pour voir le tableau Kanban
          </p>
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        labelledBy="create-sprint-modal-title"
        maxWidth="max-w-md"
        className="p-7"
      >
        <h3 id="create-sprint-modal-title" className="text-headline-sm font-bold text-on-surface mb-5">+ Nouveau Sprint</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="sprint-name" className="text-label-md text-on-surface-variant block mb-1">Nom *</label>
            <input id="sprint-name" value={newSprint.name} onChange={e => setNewSprint(p => ({ ...p, name: e.target.value }))}
                   className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary" />
          </div>
          <div>
            <label htmlFor="sprint-goal" className="text-label-md text-on-surface-variant block mb-1">Objectif</label>
            <textarea id="sprint-goal" value={newSprint.goal} onChange={e => setNewSprint(p => ({ ...p, goal: e.target.value }))}
                      className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sprint-start-date" className="text-label-md text-on-surface-variant block mb-1">Début *</label>
              <input id="sprint-start-date" type="date" value={newSprint.start_date} onChange={e => setNewSprint(p => ({ ...p, start_date: e.target.value }))}
                     className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary" />
            </div>
            <div>
              <label htmlFor="sprint-end-date" className="text-label-md text-on-surface-variant block mb-1">Fin *</label>
              <input id="sprint-end-date" type="date" value={newSprint.end_date} onChange={e => setNewSprint(p => ({ ...p, end_date: e.target.value }))}
                     className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Annuler
          </Button>
          <Button onClick={() => createSprintMutation.mutate()} disabled={!canManage || !newSprint.name || !newSprint.start_date || !newSprint.end_date || createSprintMutation.isPending}>
            {createSprintMutation.isPending ? '⏳…' : '✅ Créer'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        labelledBy="assign-modal-title"
        maxWidth="max-w-lg"
        className="p-7"
      >
        <h3 id="assign-modal-title" className="text-headline-sm font-bold text-on-surface mb-5">+ Assigner des cas à un membre</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="assign-member" className="text-label-md text-on-surface-variant block mb-1">Membre</label>
            <select id="assign-member" value={assignData.user_id} onChange={e => setAssignData(p => ({ ...p, user_id: Number(e.target.value) }))}
                    className="w-full border border-outline-variant rounded-lg bg-surface px-3 py-2.5 outline-none focus:border-primary">
              <option value={0}>Sélectionner…</option>
              {members?.results?.map((m: ProjectMember) => (
                <option key={m.user.id} value={m.user.id}>{m.user.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Cas non assignés ({unassigned?.results?.length || 0})</label>
            <div className="max-h-60 overflow-y-auto border border-outline-variant rounded-lg p-2 space-y-1">
              {!!unassigned?.results?.length && <label className="flex items-center gap-2 p-1.5 border-b border-outline-variant font-semibold"><input type="checkbox" checked={assignData.use_case_ids.length === unassigned.results.length} onChange={e => setAssignData(p => ({ ...p, use_case_ids: e.target.checked ? unassigned.results.map(uc => uc.id) : [] }))} />Sélectionner tous les cas</label>}
              {unassigned?.results?.map((uc) => (
                <label key={uc.id} className="flex items-center gap-2 p-1.5 hover:bg-surface-container-low rounded cursor-pointer">
                  <input type="checkbox" checked={assignData.use_case_ids.includes(uc.id)}
                         onChange={e => {
                           if (e.target.checked) setAssignData(p => ({ ...p, use_case_ids: [...p.use_case_ids, uc.id] }));
                           else setAssignData(p => ({ ...p, use_case_ids: p.use_case_ids.filter(id => id !== uc.id) }));
                         }} />
                  <span className="text-body-sm text-on-surface">CAS-{String(uc.case_number).padStart(3, '0')}</span>
                  <span className="text-body-sm text-on-surface-variant truncate">{uc.use_case_text || uc.description}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
            Annuler
          </Button>
          <Button onClick={() => assignMutation.mutate()} disabled={!canManage || !assignData.user_id || assignData.use_case_ids.length === 0 || assignMutation.isPending}>
            {assignMutation.isPending ? '⏳…' : `✅ Assigner (${assignData.use_case_ids.length})`}
          </Button>
        </div>
      </Modal>

      <Modal open={!!ticketEditor} onClose={() => setTicketEditor(null)} labelledBy="ticket-editor-title" maxWidth="max-w-2xl" className="p-7">
        <h3 id="ticket-editor-title" className="text-headline-sm font-bold text-on-surface mb-4">Créer un cas commun</h3>
        {ticketEditor && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <p className="text-label-md md:col-span-2 text-primary font-mono">Le numéro CAS sera attribué automatiquement et sera identique dans la recette et les sprints.</p>
          <label className="text-label-md md:col-span-2">Use Case (titre) *<input value={ticketEditor.use_case_text} onChange={e => setTicketEditor(t => t && ({ ...t, use_case_text: e.target.value }))} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md">Ticket Jira<input value={ticketEditor.jira_ticket ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, jira_ticket: e.target.value }))} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Description<textarea value={ticketEditor.description ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, description: e.target.value }))} rows={3} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Préconditions<textarea value={ticketEditor.preconditions ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, preconditions: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Étapes<textarea value={ticketEditor.steps ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, steps: e.target.value }))} rows={3} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Résultats attendus<textarea value={ticketEditor.expected_results ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, expected_results: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Résultats observés<textarea value={ticketEditor.observed_results ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, observed_results: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Commentaire initial<textarea value={ticketEditor.comment} onChange={e => setTicketEditor(t => t && ({ ...t, comment: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md">Statut Kanban<select value={ticketEditor.status ?? 'À tester'} onChange={e => setTicketEditor(t => t && ({ ...t, status: e.target.value }))} className="mt-1 w-full border rounded-lg p-2 bg-surface">{STATUS_COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="text-label-md">Assigné à<select value={ticketEditor.assigned_to ?? ''} onChange={e => setTicketEditor(t => t && ({ ...t, assigned_to: e.target.value || null }))} className="mt-1 w-full border rounded-lg p-2 bg-surface"><option value="">Non assigné</option>{members?.results?.map(m => <option key={m.id} value={m.id}>{m.user.full_name}</option>)}</select></label>
        </div>}
        {saveTicketMutation.isError && <p role="alert" className="text-error mt-3">{getApiErrorMessage(saveTicketMutation.error, 'Enregistrement impossible.')}</p>}
        <div className="flex justify-end gap-3 mt-5"><Button variant="secondary" onClick={() => setTicketEditor(null)}>Annuler</Button><Button disabled={!canManage || !ticketEditor?.use_case_text.trim() || saveTicketMutation.isPending} onClick={() => ticketEditor && saveTicketMutation.mutate(ticketEditor)}>{saveTicketMutation.isPending ? 'Enregistrement…' : 'Enregistrer le cas'}</Button></div>
      </Modal>

      <Modal open={!!assignmentEditor} onClose={() => setAssignmentEditor(null)} labelledBy="imported-case-editor-title" maxWidth="max-w-2xl" className="p-7">
        <h3 id="imported-case-editor-title" className="text-headline-sm font-bold text-on-surface mb-4">Modifier le cas</h3>
        {assignmentEditor && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <p className="text-label-md md:col-span-2 text-primary font-mono">CAS-{String(assignmentEditor.case_number).padStart(3, '0')}</p>
          <label className="text-label-md md:col-span-2">Use Case (titre)<input value={assignmentEditor.use_case_text || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, use_case_text: e.target.value }))} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md">Ticket Jira<input value={assignmentEditor.jira_ticket || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, jira_ticket: e.target.value }))} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md">Statut<select value={assignmentEditor.status} onChange={e => setAssignmentEditor(a => a && ({ ...a, status: e.target.value }))} className="mt-1 w-full border rounded-lg p-2 bg-surface">{STATUS_COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
          <label className="text-label-md md:col-span-2">Description<textarea value={assignmentEditor.description || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, description: e.target.value }))} rows={3} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Préconditions<textarea value={assignmentEditor.preconditions || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, preconditions: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Étapes<textarea value={assignmentEditor.steps || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, steps: e.target.value }))} rows={3} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Résultats attendus<textarea value={assignmentEditor.expected_results || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, expected_results: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Résultats observés<textarea value={assignmentEditor.observed_results || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, observed_results: e.target.value }))} rows={2} className="mt-1 w-full border rounded-lg p-2 bg-surface" /></label>
          <label className="text-label-md md:col-span-2">Assigné à<select value={assignmentEditor.assigned_to || ''} onChange={e => setAssignmentEditor(a => a && ({ ...a, assigned_to: e.target.value || null }))} className="mt-1 w-full border rounded-lg p-2 bg-surface"><option value="">Non assigné</option>{members?.results?.map(m => <option key={m.id} value={m.id}>{m.user.full_name}</option>)}</select></label>
        </div>}
        {saveAssignmentMutation.isError && <p role="alert" className="text-error mt-3">{getApiErrorMessage(saveAssignmentMutation.error, 'Modification impossible.')}</p>}
        <div className="flex justify-end gap-3 mt-5"><Button variant="secondary" onClick={() => setAssignmentEditor(null)}>Annuler</Button><Button disabled={!canManage || saveAssignmentMutation.isPending} onClick={() => assignmentEditor && saveAssignmentMutation.mutate(assignmentEditor)}>{saveAssignmentMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
      </Modal>

      {detailAssignmentId && selectedAssignment && (
        <UseCaseDetailModal
          assignment={selectedAssignment}
          detail={ucDetail}
          isLoading={ucDetailLoading}
          onClose={() => setDetailAssignmentId(null)}
          onUploadScreenshot={(file, caption) =>
            uploadScreenshotMutation.mutate({ assignmentId: detailAssignmentId, file, caption })
          }
          onDeleteScreenshot={(screenshotId) =>
            deleteScreenshotMutation.mutate({ assignmentId: detailAssignmentId, screenshotId })
          }
          onAddComment={(content) =>
            commentMutation.mutate({ ucId: selectedAssignment.use_case, content })
          }
          onSaveJira={(value) =>
            jiraTicketMutation.mutate({ assignmentId: selectedAssignment.id, jiraTicket: value })
          }
          isSavingJira={jiraTicketMutation.isPending}
          ucComment={ucComment}
          onCommentChange={setUcComment}
          isUploading={uploadScreenshotMutation.isPending}
          fileInputRef={fileInputRef}
          currentUserId={currentUser?.id}
        />
      )}
    </PageLayout>
  );
}

function UseCaseDetailModal({
  assignment, detail, isLoading,
  onClose, onUploadScreenshot, onDeleteScreenshot, onAddComment, onSaveJira, isSavingJira,
  ucComment, onCommentChange, isUploading, fileInputRef,
}: {
  assignment: UseCaseAssignment;
  detail?: UseCaseDetail;
  isLoading: boolean;
  onClose: () => void;
  onUploadScreenshot: (file: File, caption: string) => void;
  onDeleteScreenshot: (screenshotId: string) => void;
  onAddComment: (content: string) => void;
  onSaveJira: (value: string) => void;
  isSavingJira: boolean;
  ucComment: string;
  onCommentChange: (v: string) => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  currentUserId?: number;
}) {
  const [screenshotCaption, setScreenshotCaption] = useState('');
  const [jiraValue, setJiraValue] = useState(assignment.jira_ticket || '');

  const handleJiraBlur = () => {
    const trimmed = jiraValue.trim();
    if (trimmed !== (assignment.jira_ticket || '')) {
      onSaveJira(trimmed);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadScreenshot(file, screenshotCaption);
      setScreenshotCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uc = detail?.use_case;
  const order = assignment.case_number;
  const ucKey = assignment.use_case_text || uc?.use_case_text || assignment.use_case_id_str;
  const ucDesc = assignment.description || uc?.description || assignment.use_case_desc;
  const screenshots = detail?.screenshots ?? [];
  const comments = detail?.comments ?? [];
  const loaded = !!uc;
  const showSkeleton = isLoading && !detail;

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={`uc-detail-modal-${order}`}
      maxWidth="max-w-2xl"
      className="p-0"
    >
        <div className="sticky top-0 bg-surface z-10 flex items-center justify-between p-4 pb-3 border-b border-outline-variant">
          <h3 id={`uc-detail-modal-${order}`} className="text-headline-sm font-bold text-on-surface">
            CAS-{String(order).padStart(3, '0')} — Détails
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="w-11 h-11 rounded-lg hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant cursor-pointer">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-body-sm">
            <div>
              <span className="text-on-surface-variant font-medium">Assigné à :</span>
              <span className="ml-2 text-on-surface">{assignment.assigned_to_user?.full_name}</span>
            </div>
            <div>
              <span className="text-on-surface-variant font-medium">Statut :</span>
              <span className="ml-2 text-on-surface">{assignment.status}</span>
            </div>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Ticket Jira</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={jiraValue}
                onChange={e => setJiraValue(e.target.value)}
                onBlur={handleJiraBlur}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Ex : QA-123"
                className="flex-1 text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant"
              />
              {isSavingJira && <span className="text-body-xs text-on-surface-variant animate-pulse">⏳ Enregistrement…</span>}
            </div>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Use Case (titre)</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2">{ucKey || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Description</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{ucDesc || '—'}</p>
          </div>

          {showSkeleton ? (
            <div className="space-y-4" aria-busy="true" role="status" aria-label="Chargement du cas de test">
              {['Préconditions', 'Étapes', 'Résultats attendus', 'Résultats observés'].map(s => (
                <div key={s}>
                  <div className="h-3 w-28 bg-surface-container-high rounded animate-pulse mb-2" />
                  <div className="h-10 bg-surface-container-high rounded-lg animate-pulse" />
                </div>
              ))}
              <div className="h-3 w-24 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="h-6 w-28 bg-surface-container-high rounded animate-pulse" />
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-surface-container-high rounded-lg animate-pulse" />)}
              </div>
              <div className="h-3 w-40 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="h-24 bg-surface-container-high rounded-lg animate-pulse" />
            </div>
          ) : (
          <>
          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Préconditions</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{assignment.preconditions || uc?.preconditions || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Étapes</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{assignment.steps || uc?.steps || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Résultats attendus</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{assignment.expected_results || uc?.expected_results || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Résultats observés</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{assignment.observed_results || uc?.observed_results || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Automatisé</label>
            <span className={`inline-block px-2 py-1 rounded text-label-sm ${uc?.is_automated ? 'bg-success/20 text-success' : 'bg-surface-container-high text-on-surface-variant'}`}>
              {uc?.is_automated ? 'Oui' : 'Non'}
            </span>
          </div>

          {/* Screenshots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-label-md text-on-surface-variant font-bold">Captures d'écran ({screenshots.length})</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Légende (optionnelle)"
                  value={screenshotCaption}
                  onChange={e => setScreenshotCaption(e.target.value)}
                  className="text-body-sm px-2 py-1.5 border border-outline-variant rounded-lg max-w-40 outline-none focus:border-primary"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button size="sm" onClick={() => fileInputRef.current?.click()} loading={isUploading}>
                  + Ajouter
                </Button>
              </div>
            </div>
            {screenshots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {screenshots.map((ss: UseCaseScreenshot) => (
                  <div key={ss.id} className="relative group bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant">
                    <img src={ss.image} alt={ss.caption || 'Screenshot'} className="w-full h-32 object-cover" />
                    {ss.caption && <p className="text-body-xs text-on-surface-variant px-2 py-1 truncate">{ss.caption}</p>}
                    <p className="text-body-xs text-on-surface-variant px-2 pb-1">{ss.uploaded_by_user?.full_name}</p>
                    <button
                      onClick={() => onDeleteScreenshot(ss.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-error/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant italic">Aucune capture d'écran</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <label className="text-label-md text-on-surface-variant font-bold block mb-3">Commentaires ({comments.length})</label>
            <div className="max-h-48 overflow-y-auto space-y-3 mb-3">
              {comments.map(c => (
                <div key={c.id} className="bg-surface-container-low rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-label-sm font-medium text-on-surface">{c.author.full_name}</span>
                    <span className="text-body-xs text-on-surface-variant">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-body-sm text-on-surface">{c.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-body-sm text-on-surface-variant italic">Aucun commentaire</p>
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                placeholder="Ajouter un commentaire..."
                value={ucComment}
                onChange={e => onCommentChange(e.target.value)}
                className="flex-1 text-body-sm p-2 border border-outline-variant rounded-lg bg-surface resize-none outline-none focus:border-primary"
                rows={2}
              />
              <Button size="sm" onClick={() => onAddComment(ucComment)} disabled={!ucComment.trim() || !loaded}>
                Envoyer
              </Button>
            </div>
          </div>
          </>
          )}
        </div>
    </Modal>
  );
}
