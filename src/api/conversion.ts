import client from './client';
import type { ConversionJob, PaginatedResponse, ExtractedUseCase, BulkStatusUpdatePayload, BulkStatusUpdateResponse, FileSearchResponse } from '../types';

export const conversionApi = {
  upload: (
    wordFile: File,
    excelTemplate?: File,
    projectId?: string,
    options?: {
      companyName?: string;
      excelFilename?: string;
      companyLogo?: File;
      /** Callback de progression d'upload (0-100) */
      onUploadProgress?: (percent: number) => void;
    },
  ) => {
    const fd = new FormData();
    fd.append('word_file', wordFile);
    if (excelTemplate) fd.append('excel_template', excelTemplate);
    if (projectId) fd.append('project', projectId);
    if (options?.companyName) fd.append('company_name', options.companyName);
    if (options?.excelFilename) fd.append('excel_filename', options.excelFilename);
    if (options?.companyLogo) fd.append('company_logo', options.companyLogo);
    return client
      .post<ConversionJob>('/upload/', fd, {
        timeout: 120_000, // conversion potentiellement longue (gros documents)
        onUploadProgress: (e) => {
          if (options?.onUploadProgress && e.total) {
            options.onUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  listJobs: (page = 1) =>
    client.get<PaginatedResponse<ConversionJob>>('/jobs/', { params: { page } }).then((r) => r.data),

  getJob: (id: string) =>
    client.get<ConversionJob>(`/jobs/${id}/`).then(r => r.data),

  updateUseCase: (jobId: string, ucId: string, data: Partial<ExtractedUseCase>) =>
    client.patch<ExtractedUseCase>(`/jobs/${jobId}/use-cases/${ucId}/`, data).then(r => r.data),

  batchSave: (jobId: string, data: {
    company_name?: string;
    excel_filename?: string;
    use_cases: Array<{
      id: string;
      use_case_text?: string;
      description?: string;
      preconditions?: string;
      steps?: string;
      expected_results?: string;
      observed_results?: string;
      is_automated?: boolean;
      status?: string;
    }>;
  }) =>
    client.post<{ success: boolean; automated_count: number }>(`/jobs/${jobId}/save/`, data).then(r => r.data),

  openVscode: (jobId: string) =>
    client.post<{
      success: boolean;
      vscode_opened: boolean;
      project_path: string;
      automated_count: number;
      message: string;
    }>(`/jobs/${jobId}/vscode/`).then(r => r.data),

  generateExcel: (jobId: string) =>
    client.get(`/jobs/${jobId}/generate/`, { responseType: 'blob' }).then(r => r.data),

  generateGherkin: (jobId: string, mode?: 'gherkin' | 'cypress') =>
    client.get(`/jobs/${jobId}/gherkin/`, { params: { mode }, responseType: 'blob' }).then(r => r.data),

  searchFiles: (query: string, extensions?: string[]) =>
    client.get<FileSearchResponse>('/files/search/', {
      params: { q: query, ext: extensions },
      // Le backend lit getlist('ext') : répéter la clé sans crochets (ext=a&ext=b)
      paramsSerializer: { indexes: null },
    }).then(r => r.data),

  bulkUpdateStatus: (jobId: string, payload: BulkStatusUpdatePayload) =>
    client.post<BulkStatusUpdateResponse>(`/jobs/${jobId}/bulk-status/`, payload).then(r => r.data),

  generateCSV: (jobId: string) =>
    client.get(`/jobs/${jobId}/csv/`, { responseType: 'blob' }).then(r => r.data),

  deleteJob: (jobId: string) =>
    client.delete(`/jobs/${jobId}/`),
};
