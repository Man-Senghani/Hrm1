/**
 * Shared Role and Designation Resolution Utility
 * 
 * Maps departments to designations and manages system portal access roles.
 */

export const DEPARTMENT_DESIGNATIONS_MAP = {
  'Admin': [
    'Head of Admin'
  ],
  'Developer': [
    'Senior Developer',
    'Junior Developer',
    'Intern Developer'
  ],
  'QA': [
    'Senior QA',
    'Junior QA',
    'Intern QA'
  ],
  'Design': [
    'Senior Designer',
    'Junior Designer',
    'Intern Designer'
  ],
  'BDE': [
    'Senior BDE',
    'Junior BDE',
    'Intern BDE'
  ],
  'HR': [
    'Senior HR',
    'Junior HR',
    'Intern HR'
  ],
  'Marketing': [
    'Senior Marketing',
    'Junior Marketing',
    'Intern Marketing'
  ],
  'Finance': [
    'Senior Finance',
    'Junior Finance',
    'Intern Finance'
  ]
};

// Aliases for flexible matching
const DEPARTMENT_ALIASES = {
  'administration': 'Admin',
  'human resources': 'HR',
  'human resource': 'HR',
  'engineering': 'Developer',
  'development': 'Developer',
  'developers': 'Developer',
  'software': 'Developer',
  'quality assurance': 'QA',
  'testing': 'QA',
  'business development': 'BDE',
  'business development executive': 'BDE',
  'bd': 'BDE',
  'ui/ux': 'Design',
  'designer': 'Design'
};

/**
 * Returns available designations for a given department
 */
export const getDesignationsForDepartment = (departmentName = '', customDesignations = []) => {
  if (!departmentName || !departmentName.trim()) {
    return [];
  }

  const rawDept = departmentName.trim().toLowerCase();

  // 1. Direct match in DEPARTMENT_DESIGNATIONS_MAP
  const matchedKey = Object.keys(DEPARTMENT_DESIGNATIONS_MAP).find(
    (k) => k.toLowerCase() === rawDept
  );
  if (matchedKey) {
    const defaultList = DEPARTMENT_DESIGNATIONS_MAP[matchedKey];
    const extras = (customDesignations || []).filter(
      (c) => !defaultList.some((d) => d.toLowerCase() === (c || '').toLowerCase().trim())
    );
    return [...defaultList, ...extras];
  }

  // 2. Alias match
  if (DEPARTMENT_ALIASES[rawDept]) {
    const canonical = DEPARTMENT_ALIASES[rawDept];
    const defaultList = DEPARTMENT_DESIGNATIONS_MAP[canonical] || [];
    const extras = (customDesignations || []).filter(
      (c) => !defaultList.some((d) => d.toLowerCase() === (c || '').toLowerCase().trim())
    );
    return [...defaultList, ...extras];
  }

  // 3. Fallback for custom user-created departments
  return (customDesignations && customDesignations.length > 0) ? customDesignations : [];
};

/**
 * Resolves system access role ('admin' | 'manager' | 'employee')
 * based on department, manager checkbox, or designation.
 */
export const resolveRole = ({ department = '', isManager = false, designation = '', currentRole = 'employee' }) => {
  const normDept = (department || '').trim().toLowerCase();
  const normDesig = (designation || '').trim().toLowerCase();

  // 1. Any Intern in any department is ALWAYS strictly an employee
  if (normDesig.includes('intern')) {
    return 'employee';
  }

  // 2. Admin department or Head of Admin always gets admin role
  if (normDept === 'admin' || normDesig === 'head of admin') {
    return 'admin';
  }

  // 3. HR department: elevated access checkbox grants 'hr' role, otherwise 'employee'
  if (normDept === 'hr') {
    return isManager ? 'hr' : 'employee';
  }

  // 4. Other departments: manager checkbox grants 'manager' role
  if (isManager) {
    return 'manager';
  }

  // 5. Fallback to employee
  return 'employee';
};

/**
 * Resolves role from designation for backward compatibility
 */
export const resolveRoleFromDesignation = (designation = '', currentRole = 'employee') => {
  const d = (designation || '').toLowerCase().trim();
  if (!d) return currentRole || 'employee';

  if (d === 'head of admin' || d === 'admin') return 'admin';
  if (d.includes('intern')) return 'employee';
  if (/\bhr\b/i.test(d)) return currentRole === 'hr' ? 'hr' : 'employee';
  if (/\b(manager|lead|leader|supervisor)\b/i.test(d)) return 'manager';
  return 'employee';
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
        subtext: 'Team Leadership & Approvals (Reports directly to Admin)',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        badgeText: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800'
      };
    case 'employee':
    default:
      return {
        label: 'Employee Portal Access',
        role: 'employee',
        subtext: 'Standard Employee Portal (Staff / Junior / Senior / Intern)',
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
        badgeText: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800'
      };
  }
};


