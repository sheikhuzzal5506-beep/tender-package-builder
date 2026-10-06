export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const BLOCKING_STATUSES = new Set(['Missing', 'Expiry date needed', 'Expired']);

export function parseDateOnly(value) {
  if (!value || typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function formatDate(value, language = 'en') {
  const date = parseDateOnly(value);
  if (!date) return value || '—';
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function validateRequirementsPack(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, errors: ['file'] };
  const requiredTenderFields = ['tender_id', 'title', 'procuring_entity', 'bidder', 'submission_deadline'];
  if (!data.tender || typeof data.tender !== 'object') errors.push('tender');
  for (const field of requiredTenderFields) {
    if (!data.tender?.[field] || typeof data.tender[field] !== 'string') errors.push(field);
  }
  if (!parseDateOnly(data.tender?.submission_deadline)) errors.push('submission_deadline');
  if (!Array.isArray(data.requirements) || data.requirements.length === 0) errors.push('requirements');
  const ids = new Set();
  for (const requirement of data.requirements || []) {
    const fieldsOk = requirement && ['id', 'order', 'title_en', 'title_bn', 'mandatory', 'has_expiry'].every((key) => Object.prototype.hasOwnProperty.call(requirement, key));
    if (!fieldsOk) {
      errors.push('requirement_fields');
      continue;
    }
    if (ids.has(requirement.id)) errors.push('duplicate_id');
    ids.add(requirement.id);
    if (typeof requirement.order !== 'number' || !Number.isFinite(requirement.order)) errors.push('invalid_order');
    if (typeof requirement.title_en !== 'string' || typeof requirement.title_bn !== 'string') errors.push('title');
    if (typeof requirement.mandatory !== 'boolean' || typeof requirement.has_expiry !== 'boolean') errors.push('flags');
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function sortRequirements(requirements) {
  return [...requirements].sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)));
}

export function getRequirementStatus(requirement, matches, filesById, expiryDates, deadline) {
  const fileId = matches[requirement.id];
  const file = fileId ? filesById[fileId] : null;
  if (!file) return requirement.mandatory ? 'Missing' : 'Not provided';
  if (file.error) return 'Missing';
  if (requirement.has_expiry && !expiryDates[requirement.id]) return 'Expiry date needed';
  if (requirement.has_expiry) {
    const expiry = parseDateOnly(expiryDates[requirement.id]);
    const deadlineDate = parseDateOnly(deadline);
    if (!expiry || !deadlineDate || expiry < deadlineDate) return 'Expired';
  }
  return 'OK';
}

export function getSummary(requirements, matches, files, expiryDates, deadline) {
  const filesById = Object.fromEntries(files.map((file) => [file.id, file]));
  const statuses = requirements.map((requirement) => ({
    requirement,
    status: getRequirementStatus(requirement, matches, filesById, expiryDates, deadline),
    file: filesById[matches[requirement.id]],
  }));
  const matchedFiles = new Set(Object.values(matches).filter(Boolean));
  const duplicateGroups = new Map();
  files.filter((file) => file.hash).forEach((file) => {
    const group = duplicateGroups.get(file.hash) || [];
    group.push(file);
    duplicateGroups.set(file.hash, group);
  });
  const duplicateFiles = [...duplicateGroups.values()].filter((group) => group.length > 1).flat();
  const blocking = statuses.filter(({ status }) => BLOCKING_STATUSES.has(status));
  return {
    statuses,
    blocking,
    valid: statuses.filter(({ status }) => status === 'OK').length,
    optionalNotProvided: statuses.filter(({ status }) => status === 'Not provided').length,
    matched: matchedFiles.size,
    duplicateFiles,
    duplicateGroups: [...duplicateGroups.values()].filter((group) => group.length > 1),
    unusedDuplicates: duplicateFiles.filter((file) => !matchedFiles.has(file.id)).length,
    included: statuses.filter(({ status }) => status === 'OK').length,
  };
}

export function fileIsAvailable(file, targetRequirementId, matches, files) {
  if (!file || file.error) return false;
  for (const [requirementId, fileId] of Object.entries(matches)) {
    if (fileId === file.id && requirementId !== targetRequirementId) return false;
  }
  if (file.hash) {
    for (const [requirementId, fileId] of Object.entries(matches)) {
      if (requirementId === targetRequirementId) continue;
      const matchedFile = files.find((candidate) => candidate.id === fileId);
      if (matchedFile?.hash && matchedFile.hash === file.hash) return false;
    }
  }
  return true;
}

export function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, ' ').trim();
}

export function getMatchSuggestion(requirement, files) {
  const title = normalizeText(`${requirement.title_en} ${requirement.title_bn}`);
  const tokens = title.split(/\s+/).filter((token) => token.length > 2);
  if (!tokens.length) return null;
  let best = null;
  for (const file of files) {
    if (file.error) continue;
    const candidate = normalizeText(file.name.replace(/\.pdf$/i, ''));
    const score = tokens.reduce((sum, token) => sum + (candidate.includes(token) ? 1 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { file, score };
  }
  return best?.file || null;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusLabel(status, t) {
  const labels = {
    Missing: t('missing'),
    'Expiry date needed': t('expiryDateNeeded'),
    Expired: t('expired'),
    'Not provided': t('notProvided'),
    OK: t('ok'),
  };
  return labels[status] || status;
}
