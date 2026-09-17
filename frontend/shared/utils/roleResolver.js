/**
 * Resolves system access role ('admin' | 'hr' | 'manager' | 'employee')
 * based on the employee's designation, preserving administrative roles.
 */
export const resolveRoleFromDesignation = (designation = '', currentRole = 'employee') => {
  const normCurrent = (currentRole || '').toLowerCase().trim();

  // Rule 1: Never change or downgrade Admin or HR roles
  if (normCurrent === 'admin' || normCurrent === 'hr') {
    return normCurrent;
  }

  const d = (designation || '').toLowerCase().trim();
  if (!d) return 'employee';

  // Rule 2: Explicit Admin or HR designation
  if (d === 'admin' || d.includes('administrator')) return 'admin';
  if (d === 'hr' || d.includes('human resource')) return 'hr';

  // Rule 2: Manager / Leadership keywords
  const managerPatterns = [
    /\bsenior\b/i,
    /\bsr\.?\b/i,
    /\bmanager\b/i,
    /\blead\b/i,
    /\bleader\b/i,
    /\bhead\b/i,
    /\bdirector\b/i,
    /\bchief\b/i,
    /\bprincipal\b/i,
    /\bsupervisor\b/i,
    /\bvp\b/i,
    /\bpresident\b/i
  ];

  const isManager = managerPatterns.some((pattern) => pattern.test(d));
  return isManager ? 'manager' : 'employee';
};

/**
 * Returns UI metadata for displaying the auto-resolved portal access badge
 */
export const getRoleAccessMetadata = (role = 'employee') => {
  const norm = (role || '').toLowerCase().trim();

  switch (norm) {
    case 'admin':
      return {
        label: 'Admin Portal Access',
        role: 'admin',
        subtext: 'Full System Control',
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
        badgeText: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800'
      };
    case 'hr':
      return {
        label: 'HR Portal Access',
        role: 'hr',
        subtext: 'Personnel & HR Management',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
        badgeText: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-200 dark:border-indigo-800'
      };
    case 'manager':
      return {
        label: 'Manager Portal Access',
        role: 'manager',
        subtext: 'Team Leadership & Approvals (Senior / Lead / Manager)',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        badgeText: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800'
      };
    case 'employee':
    default:
      return {
        label: 'Employee Portal Access',
        role: 'employee',
        subtext: 'Standard Employee Portal (Staff / Junior / Intern)',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
        badgeText: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800'
      };
  }
};
