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

const STATUS_COLUMNS = ['À tester', 'En cours', 'Passé', 'Échoué', 'Bloqué'];
const STATUS_COLORS: Record<string, string> = {
  'À tester': 'bg-outline-variant',
  'En cours': 'bg-primary',
  'Passé': 'bg-success',
  'Échoué': 'bg-error',
  'Bloqué': 'bg-warning',
};

export default function SprintBoardPage() {
  const { slug, projectSlug, sprintId } = useParams<{ slug: string; projectSlug: string; sprintId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<string | ''>(sprintId || '');
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' });
  const [assignData, setAssignData] = useState({ use_case_ids: [] as string[], user_id: 0 });
  const [detailAssignmentId, setDetailAssignmentId] = useState<string | null>(null);
  const [ucComment, setUcComment] = useState('');

  const handleColumnDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const ucId = e.dataTransfer.getData('ucId');
    const sourceCol = e.dataTransfer.getData('sourceCol');

    if (!ucId || !targetCol || !sourceCol || targetCol === sourceCol) return;

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
    statusMutation.mutate({ ucId, status: newStatus });

    // Rafraîchit le tableau (le cache est invalidé par la mutation de statut)
    queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = true;

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
    enabled: !!slug && !!projectSlug && showAssignModal,
  });

  const { data: unassigned } = useQuery({
    queryKey: queryKeys.unassignedUcs(slug, projectSlug),
    queryFn: () => teamsApi.getUnassignedUseCases(slug!, projectSlug!),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.unassignedUcs(slug, projectSlug) });
      setShowAssignModal(false);
      setAssignData({ use_case_ids: [], user_id: 0 });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ ucId, status }: { ucId: string; status: string }) =>
      teamsApi.updateUseCaseStatus(slug!, projectSlug!, ucId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sprintBoard(slug, projectSlug, selectedSprint) });
    },
  });

  const jiraTicketMutation = useMutation({
    mutationFn: ({ ucId, jiraTicket }: { ucId: string; jiraTicket: string }) =>
      teamsApi.updateUseCaseJiraTicket(slug!, projectSlug!, ucId, jiraTicket),
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

  const currentSprint = sprints?.results?.find(s => s.id === selectedSprint);

  const currentUser = (() => {
    try {
      const el = document.getElementById('__AUTH_USER__');
      return el ? JSON.parse(el.textContent || '{}') : null;
    } catch { return null; }
  })();

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
                <span className="text-body-sm text-on-surface-variant font-mono">
                  {board.columns[col]?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                {(board.columns[col] || []).map((assignment) => {
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
                       e.dataTransfer.setData('ucId', assignment.use_case);
                       e.dataTransfer.setData('sourceCol', col);
                       e.dataTransfer.effectAllowed = 'move';
                     }}
                     onDragOver={(e) => e.preventDefault()}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-label-sm font-bold text-primary shrink-0">
                        CAS-{String(assignment.use_case_order).padStart(3, '0')}
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
                            onChange={(e) => { e.stopPropagation(); statusMutation.mutate({ ucId: assignment.use_case, status: e.target.value }); }}
                            className="text-[0.6rem] bg-transparent border border-outline-variant rounded px-1 py-0.5"
                          >
                            {STATUS_COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                );})}
                {(!board.columns[col] || board.columns[col].length === 0) && (
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
          <Button onClick={() => createSprintMutation.mutate()} disabled={!newSprint.name || !newSprint.start_date || !newSprint.end_date || createSprintMutation.isPending}>
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
              {unassigned?.results?.map((uc) => (
                <label key={uc.id} className="flex items-center gap-2 p-1.5 hover:bg-surface-container-low rounded cursor-pointer">
                  <input type="checkbox" checked={assignData.use_case_ids.includes(uc.id)}
                         onChange={e => {
                           if (e.target.checked) setAssignData(p => ({ ...p, use_case_ids: [...p.use_case_ids, uc.id] }));
                           else setAssignData(p => ({ ...p, use_case_ids: p.use_case_ids.filter(id => id !== uc.id) }));
                         }} />
                  <span className="text-body-sm text-on-surface">UC#{uc.order}</span>
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
          <Button onClick={() => assignMutation.mutate()} disabled={!assignData.user_id || assignData.use_case_ids.length === 0 || assignMutation.isPending}>
            {assignMutation.isPending ? '⏳…' : `✅ Assigner (${assignData.use_case_ids.length})`}
          </Button>
        </div>
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
            jiraTicketMutation.mutate({ ucId: selectedAssignment.use_case, jiraTicket: value })
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
  const order = uc?.order ?? assignment.use_case_order;
  const ucKey = uc?.use_case_text ?? assignment.use_case_id_str;
  const ucDesc = uc?.description ?? assignment.use_case_desc;
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
            UC#{order} — Détails
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
            <label className="text-label-md text-on-surface-variant block mb-1">Use Case ID</label>
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
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{uc?.preconditions || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Étapes</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{uc?.steps || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Résultats attendus</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{uc?.expected_results || '—'}</p>
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant block mb-1">Résultats observés</label>
            <p className="text-body-base text-on-surface bg-surface-container-low rounded-lg px-3 py-2 whitespace-pre-wrap">{uc?.observed_results || '—'}</p>
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