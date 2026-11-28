import { describe, expect, it } from 'vitest';
import { invalidJiraKeys, jiraFormatWarning, splitJiraKeys } from './jira';

describe('jira helpers', () => {
  it('splits and deduplicates references', () => {
    expect(splitJiraKeys('QA-1, QA-2\nQA-1; ')).toEqual(['QA-1', 'QA-2']);
    expect(splitJiraKeys(undefined)).toEqual([]);
  });

  it('flags references that do not match PROJECT-123', () => {
    expect(invalidJiraKeys('QA-1, qa-2, QA3, PROJ_2-15')).toEqual(['qa-2', 'QA3']);
    expect(jiraFormatWarning('QA-1')).toBe('');
    expect(jiraFormatWarning('oops')).toContain('oops');
  });
});
